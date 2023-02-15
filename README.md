# Start Inference Runner Test App
1. `docker-compose up`
2. https://localhost

# Nginx
1. nginx is used as reverse proxy for both services UI and backend
2. HTTP Load Balancing is used to ensure fault‑tolerant configuration
3. Content Caching is used to improve response time to clients and reduce load on the servers
4. Added redirect all HTTP requests to HTTPS

# Express
1. Configuration options can be changed using docker-compose `environment`
2. Retry pattern is used as Resiliency pattern
3. Assuming `Inference Runner` service responds with a reasonable amount of chunks. In the other case, pagination should be mentioned in the requirements
4. **Question:** If some chunks can't be fetched for any reason. What preferred behavior should be?
  - Search request is failed
  - Response should contain only fetched chunks
  - failed chunk returned empty html?


# React
1. Material UI is React components library
2. DOMPurify is used to sanitize html output

