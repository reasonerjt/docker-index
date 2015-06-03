FROM pallet/registry-swift

RUN apt-get update && apt-get install -y python-mysqldb
COPY *.py /root/
CMD /root/test_db.py && docker-registry
