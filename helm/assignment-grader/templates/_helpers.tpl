{{/*
Expand the name of the chart.
*/}}
{{- define "assignment-grader.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "assignment-grader.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "assignment-grader.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "assignment-grader.labels" -}}
helm.sh/chart: {{ include "assignment-grader.chart" . }}
{{ include "assignment-grader.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "assignment-grader.selectorLabels" -}}
app.kubernetes.io/name: {{ include "assignment-grader.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API labels
*/}}
{{- define "assignment-grader.api.labels" -}}
{{ include "assignment-grader.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API selector labels
*/}}
{{- define "assignment-grader.api.selectorLabels" -}}
{{ include "assignment-grader.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
WebSocket labels
*/}}
{{- define "assignment-grader.ws.labels" -}}
{{ include "assignment-grader.labels" . }}
app.kubernetes.io/component: ws
{{- end }}

{{/*
WebSocket selector labels
*/}}
{{- define "assignment-grader.ws.selectorLabels" -}}
{{ include "assignment-grader.selectorLabels" . }}
app.kubernetes.io/component: ws
{{- end }}

{{/*
Worker labels
*/}}
{{- define "assignment-grader.worker.labels" -}}
{{ include "assignment-grader.labels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Worker selector labels
*/}}
{{- define "assignment-grader.worker.selectorLabels" -}}
{{ include "assignment-grader.selectorLabels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "assignment-grader.frontend.labels" -}}
{{ include "assignment-grader.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "assignment-grader.frontend.selectorLabels" -}}
{{ include "assignment-grader.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the secret
*/}}
{{- define "assignment-grader.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "assignment-grader.fullname" . }}-secrets
{{- end }}
{{- end }}

{{/*
Create the name of the configmap
*/}}
{{- define "assignment-grader.configMapName" -}}
{{- include "assignment-grader.fullname" . }}-config
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "assignment-grader.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" .Release.Name }}
{{- else }}
{{- .Values.externalDatabase.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "assignment-grader.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "5432" }}
{{- else }}
{{- .Values.externalDatabase.port | default "5432" }}
{{- end }}
{{- end }}

{{/*
PostgreSQL database
*/}}
{{- define "assignment-grader.postgresql.database" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.externalDatabase.database }}
{{- end }}
{{- end }}

{{/*
PostgreSQL username
*/}}
{{- define "assignment-grader.postgresql.username" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.username }}
{{- else }}
{{- .Values.externalDatabase.username }}
{{- end }}
{{- end }}

{{/*
PostgreSQL password secret key
*/}}
{{- define "assignment-grader.postgresql.passwordSecretKey" -}}
{{- if .Values.postgresql.enabled }}
password
{{- else }}
{{- .Values.externalDatabase.existingSecretPasswordKey | default "password" }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "assignment-grader.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" .Release.Name }}
{{- else }}
{{- .Values.externalRedis.host }}
{{- end }}
{{- end }}

{{/*
Redis port
*/}}
{{- define "assignment-grader.redis.port" -}}
{{- if .Values.redis.enabled }}
{{- printf "6379" }}
{{- else }}
{{- .Values.externalRedis.port | default "6379" }}
{{- end }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "assignment-grader.databaseUrl" -}}
postgresql://{{ include "assignment-grader.postgresql.username" . }}:$(POSTGRES_PASSWORD)@{{ include "assignment-grader.postgresql.host" . }}:{{ include "assignment-grader.postgresql.port" . }}/{{ include "assignment-grader.postgresql.database" . }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "assignment-grader.redisUrl" -}}
redis://{{ include "assignment-grader.redis.host" . }}:{{ include "assignment-grader.redis.port" . }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "assignment-grader.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
