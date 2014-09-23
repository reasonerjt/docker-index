[![Build Status](https://travis-ci.org/ekristen/docker-index.png)](https://travis-ci.org/ekristen/docker-index)

**Version 1.3.0** is out, or at least in release candidacy. It now works with 0.8.x and 0.7.x versions of the docker registry. The whole purpose of this project is to provide the docker masses with an authenticated docker index for their own docker registry that has real repository access controls instead of just using htaccess on a reverse proxy. There is now a *private mode* (which admittedly probably isn't the best name) but its function is to allow people to register using the docker-index but accounts get locked out immediately.

While I don't have any problems using this software, I cannot say that it is 100% without bug or will work with anyone, I know some people have downloaded the project, but I haven received zero feedback as to functionality.

This is a functioning Docker Index that can be run independent of the Docker Registry software.

# Important
I'm in the process of writing unit tests, and better documentation. I'm also working on writing API endpoints to facilitate the creation and management of user accounts too, so check by.

The documentation below should still be accurate, but if you run into issues, please let me know.

# New Command Line Tool
With the latest code in master, there is now a command line tool that accompanies this index. https://github.com/ekristen/docker-index-cli The purpose of this tool is to easy the administration burden of the index. See https://github.com/ekristen/docker-index-cli/blob/master/README.md for more information.

## Requirements 

1. Docker
2. Docker Registry
3. Redis (this stores image and user information, you should run redis in a persistent mode that will meet your needs)

## Installation

The best way to do this is to use docker all the way and to use host mounted volumes for configuration files OR build each app by checking out the code and changing the configuration files.

1. git clone 
2. docker pull dockerfile/redis
3. docker pull registry
4. docker build -t docker_index .
5. Create folders for the docker registry and index config files.
  * mkdir /data/registry/config
  * mkdir /data/index/config
6. Grab a copy of the registry config file, and create a *prod* section and fill it out according to your needs and drop it in the folder you created for the registry using the filename *config.yml*. Make sure you set index_endpoint configuration option.
7. docker run -d -name "index_redis" dockerfile/redis
8. docker run -d -name "docker_registry" -p 5000:5000 -e SETTINGS\_FLAVOR=prod -v /data/registry/config:/docker-registry/config
9. docker run -d -name "docker_index" -p 5100:5100 -e REGISTRIES=hostname.to.registry --link index\_redis:redis -v /data/index/config:/opt/app/config docker\_index

I'd suggest that you front both the index and the registry using nginx and SSL/TLS and use port 443.

## Management

All management is done via the new command line tool over at https://github.com/ekristen/docker-index-cli

### Initial Admin Account

When you start the docker index up for the first time a authorization token will be output to standard out, with this token you can create your first admin account. The token expires automatically after 30 minutes or after the first use when adding a user to the system. The token can only be used to add a user.

`docker-index adduser --username="admin" --password="admin" --email="admin@localhost" --admin --token="TOKEN"`


## Access Levels (Permissions)

There are four access levels (aka permissions) for a namespace and/or repo combination. They are `read`, `write`, `readwrite` `admin`.

* **read** is pretty self explanatory, gives the user full read access to the namespace and/or namespace repo combo.
* **write** gives a user write access only, this is useful for automation scripts that you want to only have access to upload to a repo.
* **readwrite** gives a user read and write access.
* **admin** gives a user read, write, and delete (not implemented) access to a namespace and/or namespace/repo.

