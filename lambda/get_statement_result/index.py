import logging
import boto3
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rs_data = boto3.client("redshift-data")


def handler(event, context):
    logger.info('Event: %s', event)
    statement_id = event["Id"]
    results = []

    # We fetch all the records just for demo purpose.
    next_token = ''
    while True:
        response = rs_data.get_statement_result(
            Id=statement_id, NextToken=next_token)
        results.append(response['Records'])
        if 'NextToken' in response:
            next_token = response['NextToken']
        else:
            break
        time.sleep(0.5)

    logger.info('results: %s', results)
    return {
        'NumRows': len(results),
    }
