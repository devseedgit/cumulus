// npm packages
const fs = require('fs');
const Handlebars = require('handlebars');
const { s3 } = require('@cumulus/common/aws');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 550000;

const {
  LambdaStep,
  waitForCompletedExecution
} = require('@cumulus/integration-tests');
const { randomString } = require('@cumulus/common/test-utils');

const { loadConfig } = require('../helpers/testUtils');
const {
  createOrUseTestStream,
  putRecordOnStream,
  waitForActiveStream,
  waitForTestSfStarted
} = require('../helpers/kinesisHelpers');
const testConfig = loadConfig();
const lambdaStep = new LambdaStep();

const streamName = testConfig.streamName;
const granuleId = 'L2_HR_PIXC_product_0001-of-4154';
const recordTemplate = Handlebars.compile(fs.readFileSync(`./data/records/${granuleId}.json`, 'utf8'));
const record = JSON.parse(recordTemplate(testConfig));
const recordIdentifier = randomString();
record.identifier = recordIdentifier;

const recordFile = record.product.files[0];
const expectedTranslatePayload = {
  granules: [
    {
      granuleId: record.product.name,
      files: [
        {
          path: 'unit/test-data',
          url_path: recordFile.uri,
          bucket: record.bucket,
          name: recordFile.name,
          size: recordFile.size
        }
      ]
    }
  ]
};

const fileData = expectedTranslatePayload.granules[0].files[0];
const filePrefix = 'file-staging/mhs-cumulus/L2_HR_PIXC';

const fileDataWithFilename = {
  ...fileData,
  filename: `s3://${testConfig.privateBucket}/${filePrefix}/${recordFile.name}`,
  bucket: testConfig.privateBucket,
  url_path: '',
  fileStagingDir: filePrefix
};

const expectedSyncGranulesPayload = {
  granules: [
    {
      granuleId: granuleId,
      files: [fileDataWithFilename]
    }
  ]
};


// When Cumulus is configured to trigger a CNM workflow from a Kinesis stream and a message appears on the stream, Cumulus triggers the workflow
describe('The Cloud Notification Mechanism Kinesis workflow', () => {
  const maxWaitTime = 1000 * 60 * 2;
  let workflowExecution;
  let executionStatus;
  let s3FileHead;

  afterAll(async () => {
    await s3().deleteObject({
      Bucket: testConfig.privateBucket,
      Key: `${filePrefix}/${fileData.name}`
    }).promise();
  });

  beforeAll(() => {
    this.workflowExecution = null;
  });

  it('finds or creates a test stream.', async () => {
    await createOrUseTestStream(streamName);
  });

  it('waits for the stream to be active.', async () => {
    await waitForActiveStream(streamName);
  });

  it('places a record on the stream.', async () => {
    await putRecordOnStream(streamName, record);
  });

  it('waits for the triggered step function to start', async () => {
    workflowExecution = await waitForTestSfStarted(recordIdentifier, maxWaitTime);
    this.workflowExecution = workflowExecution;
  });

  it('finds a valid workflow execution.', () => {
    expect(this.workflowExecution).not.toBe(undefined);
  });

  it('waits for step function to complete', async () => {
    executionStatus = await waitForCompletedExecution(this.workflowExecution.executionArn);
  });

  it('executes successfully', () => {
    expect(executionStatus).toEqual('SUCCEEDED');
  });

  describe('the TranslateMessage Lambda', () => {
    beforeAll(() => {
      this.lambdaOutput = null;
    });

    it('waits for CNMToCMA to complete', async () => {
      this.lambdaOutput = await lambdaStep.getStepOutput(this.workflowExecution.executionArn, 'CNMToCMA');
    });

    it('outputs the granules object', () => {
      expect(this.lambdaOutput.payload).toEqual(expectedTranslatePayload);
    });
  });

  describe('the SyncGranule Lambda', () => {
    beforeAll(() => {
      this.lambdaOutput = null;
    });

    it('waits for SyncGranule to complete', async () => {
      this.lambdaOutput = await lambdaStep.getStepOutput(this.workflowExecution.executionArn, 'SyncGranule');
    });

    it('outputs the granules object', () => {
      expect(this.lambdaOutput.payload).toEqual(expectedSyncGranulesPayload);
    });

    it('syncs data to s3', async () => {
      s3FileHead = await new Promise((resolve, reject) => {
        s3().headObject({
          Bucket: testConfig.privateBucket,
          Key: `${filePrefix}/${fileData.name}`
        }, (err, data) => {
          if (err) reject(err);
          resolve(data);
        });
      });
      // Seems like a race condition?  Should create a date in the first 'The
      // Ingest Kinesis workflow'::beforeAll?  Maybe I just don't understand
      // what this is testing.
      expect(new Date() - s3FileHead.LastModified < maxWaitTime).toBeTruthy();
    });
  });
});
