# Reviewed multi-architecture index; update deliberately after rebuilding/tests.
FROM nginx:1.30.6-alpine@sha256:47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html style.css script.js core.js config.js /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
# Skip root-oriented upstream entrypoint scripts; no runtime config mutation.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
