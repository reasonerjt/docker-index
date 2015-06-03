#!/usr/bin/env python
from sqlalchemy import *
import traceback
import os
import time
def test_connect(conn_str, max_retry=5, interval=30):
    engine = create_engine(conn_str)
    print "trying to connect to %s" % conn_str
    i = 0
    while i < max_retry:
        try:
            engine.connect() 
            print "Connected successfully"
            return 
        except Exception as e:
            print e
            print "sleep %d seconds and retry" % interval
            i += 1
            time.sleep(interval)
    else:
        print "Exceeds may retry: %d" % max_retry
        raise Exception("Failed to connect to DB")

if __name__ == "__main__":
    db_str = os.environ.get("SQLALCHEMY_INDEX_DATABASE")
    if db_str:
        test_connect(db_str)
    else:
        print "env var SQLALCHEMY_INDEX_DATABASE not set, skip test connect"
