# Topic Taxonomy (MVP)

This document defines the tag taxonomy for an interview drilling app.

Design goals:
- Offline-first: tags are local; no server lookups.
- Git-friendly: stable, human-readable slugs; additive changes preferred.
- Minimal but realistic: enough coverage for Java backend + common full-stack interviews.

Conventions:
- Tags are lowercase, kebab-case.
- Prefix families with a domain: `backend/`, `frontend/`, `algo/`, `cs/`, `db/`, `jvm/`, `java/`, `sys/`, `meta/`.
- A question can have multiple tags; avoid over-tagging (3-6 tags typical).

## Java Backend

- java/basics
- java/oop
- java/generics
- java/annotations
- java/exceptions
- java/collections
- java/io-nio

- backend/spring-core
- backend/spring-mvc
- backend/spring-boot
- backend/spring-security
- backend/mybatis

- backend/rest
- backend/serialization
- backend/validation
- backend/versioning
- backend/idempotency

- backend/auth-session
- backend/auth-jwt
- backend/oauth2-oidc
- backend/rbac-abac

- backend/unit-test
- backend/integration-test
- backend/contract-test

- backend/logging
- backend/metrics
- backend/tracing

- backend/cache
- backend/message-queue
- backend/search

## Frontend

- frontend/html
- frontend/css
- frontend/js-basics
- frontend/js-async
- frontend/dom
- frontend/browser-storage

- frontend/typescript
- frontend/react
- frontend/router
- frontend/state-management

- frontend/build-tooling
- frontend/performance
- frontend/testing
- frontend/security

- frontend/http
- frontend/cors
- frontend/websocket

## Algorithms

- algo/big-o
- algo/array
- algo/string
- algo/hashmap
- algo/stack
- algo/queue
- algo/linked-list
- algo/tree
- algo/heap
- algo/graph

- algo/two-pointers
- algo/sliding-window
- algo/binary-search
- algo/greedy
- algo/dp
- algo/backtracking

## CS Foundations

- cs/os-process-thread
- cs/os-memory
- cs/os-file-io

- cs/network-tcp
- cs/network-http1
- cs/network-tls
- cs/network-dns

## Databases

- db/sql
- db/index
- db/transactions
- db/isolation-levels
- db/query-plans

- db/mysql-innodb
- db/mysql-indexing

- db/redis

## JVM

- jvm/memory-model
- jvm/heap-layout
- jvm/gc-basics
- jvm/gc-g1
- jvm/classloading
- jvm/jit
- jvm/profiling

## Concurrency

- concurrency/threading
- concurrency/synchronization
- concurrency/volatile
- concurrency/atomic
- concurrency/threadlocal
- concurrency/executors

## System Design

- sys/sla-slo
- sys/capacity-planning
- sys/caching
- sys/load-balancing
- sys/rate-limiting
- sys/backpressure
- sys/queueing

- sys/data-modeling
- sys/consistency
- sys/cap-theorem

- sys/fault-tolerance
- sys/retries-timeouts
- sys/circuit-breaker

- sys/threat-model
- sys/secrets
- sys/data-privacy

## Meta / Process

- meta/behavioral
- meta/project-deep-dive
- meta/debugging
- meta/tradeoffs
