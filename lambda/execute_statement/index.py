import boto3
import logging
import os

redshift_cluster_identifier = os.environ['CLUSTER_IDENTIFIER']
redshift_database = os.environ['DATABASE_NAME']
redshift_user = os.environ['USERNAME']

rs_data = boto3.client("redshift-data")

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logger.info("Event: %s", event)

    # a random query just for demo purpose. It gets all the table names available.
    sql = f"""
select s.nspname as table_schema,
       s.oid as schema_id
from pg_catalog.pg_namespace s
    """
    logger.info("sql: %s", sql)

    response = rs_data.execute_statement(
        ClusterIdentifier=redshift_cluster_identifier,
        Database=redshift_database,
        DbUser=redshift_user,
        Sql=sql,
    )
    logger.info("response: %s", response)
    return {
        "statementId": response["Id"],
    }
