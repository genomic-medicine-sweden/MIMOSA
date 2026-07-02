FROM insapathogenomics/reportree:v2.5.4

WORKDIR /app

RUN useradd -m -u 1000 automation  # Create non-root user

COPY automation/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY automation/automation.py .
COPY automation/docker-entrypoint.py /usr/local/bin/docker-entrypoint.py
COPY scripts/ ./scripts/

ENV PYTHONPATH=/app/scripts

RUN mkdir -p /tmp/mimosa_automation \
    && chown -R automation:automation /app /tmp/mimosa_automation

ENTRYPOINT ["python", "/usr/local/bin/docker-entrypoint.py"]
CMD ["python", "automation.py"]
