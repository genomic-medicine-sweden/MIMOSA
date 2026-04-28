FROM insapathogenomics/reportree:v2.5.4

WORKDIR /app

RUN useradd -m -u 1000 automation # Create non-root user

COPY automation/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY automation/automation.py .
COPY scripts/ ./scripts/

ENV PYTHONPATH=/app/scripts

RUN mkdir -p /tmp/mimosa_automation \
    && chown -R automation:automation /app /tmp/mimosa_automation

# Switch to non-root user
USER automation 


CMD ["python", "automation.py"]
