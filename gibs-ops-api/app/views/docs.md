# GIBS Ops API

Defines an API for operating GIBS.

## /health

Returns an application health response.

```Bash
curl http://localhost:3000/health
```
```JSON
{"ok?": true}
```

## /workflow_status

Returns a list of configured ingest workflows along with recent executions.

Params:

* `stack_name` - The name of the deployed AWS CloudFormation stack containing Step Function State Machines.

```Bash
curl "http://localhost:3000/workflow_status?stack_name=gitc-xx"
```
```JSON
[
  {
    "id": "DiscoverVIIRS",
    "name": "VIIRS Discovery",
    "success_ratio": {
      "successes": 322,
      "total": 448
    },
    "performance": [
      {
        "50": 22000,
        "95": 199650,
        "date": 1495152000000
      },
      ...
    ],
    "products": [
      {
        "id": "VNGCR_LQD_C1",
        "last_granule_id": "2017142",
        "last_execution": {
          "stop_date": 1495458287000,
          "success": true
        },
        "success_ratio": {
          "successes": 108,
          "total": 150
        },
        "performance": [
          {
            "50": 192000,
            "95": 202900,
            "date": 1495152000000
          },
          ...
        ],
        "num_running": 1
      },
      ...
    ]
  },
  ...
]
```

## /service_status

Returns a list of statuses of the services running for GIBS

```Bash
curl 'http://localhost:3000/service_status'
```

The response contains the number of tasks that should be running for the service. Any running tasks are included in the service with the date at which they were started. A number of running tasks less than the desired count indicates that not enough tasks are running.

```JSON
{
  "services": [
    {
      "service_name": "GenerateMrf",
      "desired_count": 2,
      "events": [
        {
          "id": "3ec891c4-cb83-4c49-bb16-3d1ab0c5f8eb",
          "date": "2017-05-26T11:42:53.817Z",
          "message": "(service gitc-xx-IngestStack-123-GenerateMrfService) has reached a steady state."
        }
      ],
      "running_tasks": [
        {
          "started_at": "2017-05-26T11:42:47.173Z"
        },
        {
          "started_at": "2017-05-26T11:42:46.190Z"
        }
      ]
    },
    {
      "service_name": "SfnScheduler",
      "desired_count": 1,
      "events": [
        {
          "id": "739c811c-415f-4971-a9e9-fcec02d4329a",
          "date": "2017-05-19T18:23:00.538Z",
          "message": "(service gitc-xx-IngestStack-123-SfnSchedulerService) was unable to place a task because no container instance met all of its requirements. Reason: No Container Instances were found in your cluster. For more information, see the Troubleshooting section of the Amazon ECS Developer Guide."
        }
      ],
      "running_tasks": [
        {
          "started_at": "2017-05-26T11:42:39.777Z"
        }
      ]
    },
    {
      "service_name": "OnEarth",
      "desired_count": 3,
      "events": [
        {
          "id": "5aa0c9f4-7dd0-4951-a3b9-f486afcd611f",
          "date": "2017-05-23T03:19:54.716Z",
          "message": "(service gibs-oe-xx-OnEarthStack-123-OnearthDocker) has reached a steady state."
        },
        {
          "id": "61f80e6d-b261-4e18-afb1-d2dd986106d1",
          "date": "2017-05-17T15:07:09.191Z",
          "message": "(service gibs-oe-xx-OnEarthStack-123-OnearthDocker) has started 3 tasks: (task 81524543-74d1-4d95-b455-7cff89088515) (task 9d78d227-9882-4302-8f9f-4deab64484c6) (task 07520087-779a-490d-bd69-34f1e4c12a66)."
        }
      ],
      "running_tasks": [
        {
          "started_at": "2017-05-17T15:09:46.169Z"
        },
        {
          "started_at": "2017-05-17T15:09:52.604Z"
        },
        {
          "started_at": "2017-05-17T15:09:48.299Z"
        }
      ]
    }
  ],
  "connections": {
    "MODAPS": {
      "connection_limit": 50,
      "used": 40
    },
    "LARC": {
      "connection_limit": 50,
      "used": 0
    }
  }
}

```

## /product_status

Returns status information on a product (aka collection) within a particular workflow.

Params:

* `stack_name` - The name of main top level stack that contains ingest and other substacks.
* `workflow_id` - The id of the workflow
* `collection_id` - The id of the collection
* `num_executions` - The maximum number of executions to return.

```Bash
curl 'http://localhost:3000/product_status?stack_name=gitc-xx&workflow_id=IngestVIIRS&collection_id=VNGCR_LQD_C1&num_executions=5'
```

The response contains a list of the executions currently running for the workflow for the collection along with a set of completed executions and the performance latencies on days over the past week.

```JSON
{
  "running_executions": [
    {
      "uuid": "c0d98c30-67be-4e8a-98b0-1412af0d6750",
      "start_date": "2017-06-07T06:22:40.312Z",
      "granule_id": "2017158",
      "current_state": "MRFGen",
      "reason": "Timer"
    },
    ...
  ],
  "completed_executions": [
    {
      "uuid": "12b44f50-70e3-41dd-93b2-f90f44aa3771",
      "start_date": "2017-06-08T17:37:52.000Z",
      "stop_date": "2017-06-08T17:37:54.000Z",
      "elapsed_ms": 2000,
      "success": true,
      "granule_id": "2017152",
      "reason": "Timer"
    },
    {
      "uuid": "12b44f50-70e3-41dd-93b2-f90f44aa3772",
      "start_date": "2017-06-08T17:37:52.000Z",
      "stop_date": "2017-06-08T17:37:54.000Z",
      "elapsed_ms": 2000,
      "success": true,
      "granule_id": "2017153",
      "reason": "Manual Reingest"
    },
    ...
  ],
  "performance": [
    {
      "50": 1000,
      "95": 2000,
      "date": 1496275200000
    },
    ...
  ]
}

```


## /reingest_granule

Starts reingesting the given granule

Params:

* `stack_name` - The name of main top level stack that contains ingest and other substacks.
* `collection_id` - The id of the collection
* `granule_id` - The id of the granule to start reingesting.

```Bash
curl -XPOST 'http://localhost:3000/reingest_granule?stack_name=gitc-jg&collection_id=VNGCR_NQD_C1&granule_id=2017157'
```

## /reingest_granules

Kicks off reingesting granules for the collections in the list. It first does discovery of the granules found between the start and end dates and then ingests any new data found.

Params:

* `stack_name` - The name of main top level stack that contains ingest and other substacks.
* `collection_ids` - Comma separated list of ids of collections to reingest.
* `start_date` - The inclusive temporal start date of the granules to look for. Should use milliseconds since epoch time.
* `end_date` - The inclusive temporal end date of the granules to look for. Should use milliseconds since epoch time.

```Bash
curl -XPOST
'http://localhost:3000/reingest_granules?stack_name=gitc-xx&collection_ids=VNGCR_NQD_C1%2CVNGCR_SQD_C1&start_date=1497672000000&end_date=1497758400000'
```