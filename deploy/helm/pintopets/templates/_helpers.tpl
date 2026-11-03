{{- define "pintopets.labels" -}}
app.kubernetes.io/part-of: pintopets
app.kubernetes.io/managed-by: helm
app.kubernetes.io/instance: {{ .Release.Name }}
pintopets.app/env: {{ .Values.env }}
{{- end -}}

{{- define "pintopets.selector" -}}
app.kubernetes.io/name: pintopets-web
{{- end -}}

