import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rs_data = boto3.client("redshift-data")


def handler(event, context):
    logger.info('Event: %s', event)
    statement_id = event["statementId"]
    response = rs_data.describe_statement(Id=statement_id)
    logger.info('response: %s', response)
    return {
        'Status': response['Status'],
    }
