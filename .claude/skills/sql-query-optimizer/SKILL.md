---
name: sql-query-optimizer
description: Optimize SQL queries, Entity Framework queries, and PostgreSQL performance for this project. Use whenever analyzing slow endpoints, optimizing database access, reviewing repositories, improving LINQ queries, reducing database latency, or reviewing migrations.
---

# SQL Query Optimization Skill

You are optimizing database performance for this application.

## Primary Goal

Reduce response time, CPU usage, memory usage, and database round trips without changing business logic.

## Always Check

- Missing indexes
- Full table scans
- SELECT *
- N+1 queries
- Multiple database round trips
- Large joins
- Correlated subqueries
- Expensive ORDER BY
- OFFSET pagination
- Unnecessary Include()
- Client-side evaluation
- Duplicate queries
- Over-fetching data

## Entity Framework

Prefer:

- AsNoTracking() for read-only queries
- Projection using Select()
- ExecuteUpdate/ExecuteDelete when appropriate
- Batch operations
- Compiled queries for hot paths
- Avoid lazy loading
- Filter before Include()

Detect:

- N+1 queries
- Multiple SaveChanges()
- Premature ToList()
- Unnecessary tracking

## PostgreSQL

Recommend:

- Composite indexes
- Partial indexes
- Covering indexes where appropriate
- EXPLAIN ANALYZE
- VACUUM / ANALYZE when relevant
- Proper index ordering

Avoid:

- Sequential scans on large tables
- Functions on indexed columns
- OR conditions preventing index usage

## API Performance

When reviewing endpoints:

- Count database queries
- Minimize round trips
- Recommend caching where appropriate
- Recommend pagination
- Detect expensive serialization
- Detect unnecessary object mapping

## Output Format

### Performance Issues

### Optimized Code

### SQL Improvements

### Recommended Indexes

### Estimated Performance Impact

Explain why every recommendation improves performance.