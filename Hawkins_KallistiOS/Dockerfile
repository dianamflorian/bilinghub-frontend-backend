FROM ubuntu:22.04

RUN mkdir /app
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    git python3 python3-pip python3-setuptools python-is-python3 \
    build-essential curl cmake libelf-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Repository setup must happen via patches or at runtime.

RUN pip3 install pytest

ENTRYPOINT ["/bin/bash"]
