{{- define "pintopets.labels" -}}
app.kubernetes.io/part-of: pintopets
app.kubernetes.io/managed-by: helm
app.kubernetes.io/instance: {{ .Release.Name }}
pintopets.app/env: {{ .Values.env }}
{{- end -}}

{{- define "pintopets.selector" -}}
app.kubernetes.io/name: pintopets-web
{{- end -}}

{{- define "pintopets.postgresSelector" -}}
app.kubernetes.io/name: pintopets-postgres
{{- end -}}

{{/* Env shared by the web container and the migrations init container. */}}
{{- define "pintopets.databaseEnv" -}}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: pintopets-postgres
      key: POSTGRES_PASSWORD
- name: DATABASE_URL
  value: "postgres://{{ .Values.postgres.user }}:$(POSTGRES_PASSWORD)@pintopets-postgres:5432/{{ .Values.postgres.database }}"
{{- end -}}
