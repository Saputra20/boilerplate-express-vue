#!/usr/bin/env bash
set -euo pipefail
iptables -C INPUT '!' -i lo -p tcp --dport 3000 -j DROP 2>/dev/null || \
  iptables -I INPUT 1 '!' -i lo -p tcp --dport 3000 -j DROP
