FROM nginx:alpine
COPY --chown=root:root ./dockerfiles/nginx/*.conf /etc/nginx/conf.d/
COPY --chown=root:root ./dockerfiles/nginx/certs /etc/nginx/certs
RUN mkdir -p /w/www
EXPOSE 80
