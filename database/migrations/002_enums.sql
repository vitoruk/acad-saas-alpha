-- =============================================================
-- 002_enums.sql
-- Tipos enumerados do domínio
-- =============================================================

CREATE TYPE public.role_usuario AS ENUM (
  'aluno',
  'professor',
  'secretaria',
  'admin',
  'super_admin'
);

CREATE TYPE public.status_matricula AS ENUM (
  'ativo',
  'trancado',
  'cancelado',
  'formado',
  'transferido',
  'evadido'
);

CREATE TYPE public.status_aluno AS ENUM (
  'ativo',
  'trancado',
  'jubilado',
  'formado',
  'transferido',
  'evadido',
  'cancelado'
);

CREATE TYPE public.modalidade_curso AS ENUM (
  'presencial',
  'ead',
  'semipresencial'
);

CREATE TYPE public.turno_curso AS ENUM (
  'matutino',
  'vespertino',
  'noturno',
  'integral',
  'ead'
);

CREATE TYPE public.grau_curso AS ENUM (
  'bacharelado',
  'licenciatura',
  'tecnologico',
  'sequencial',
  'pos_lato',
  'pos_stricto_mestrado',
  'pos_stricto_doutorado'
);

CREATE TYPE public.tipo_disciplina AS ENUM (
  'teorica',
  'pratica',
  'teorico_pratica',
  'estagio',
  'tcc',
  'atividade_complementar'
);

CREATE TYPE public.tipo_relacao_matriz AS ENUM (
  'obrigatoria',
  'optativa',
  'eletiva'
);

CREATE TYPE public.status_requerimento AS ENUM (
  'pendente',
  'em_analise',
  'aprovado',
  'rejeitado',
  'cancelado',
  'concluido'
);

CREATE TYPE public.tipo_certificado AS ENUM (
  'a1',
  'a3',
  'ecpf',
  'ecnpj'
);

CREATE TYPE public.tipo_assinatura AS ENUM (
  'email_simples',
  'icp_brasil_a1',
  'icp_brasil_a3',
  'autoassinada'
);

CREATE TYPE public.tipo_provider_timestamp AS ENUM (
  'opentimestamps',
  'rfc3161_certisign',
  'rfc3161_safeid',
  'rfc3161_custom'
);

CREATE TYPE public.status_diploma AS ENUM (
  'em_emissao',
  'emitido',
  'registrado',
  'revogado',
  'cancelado'
);
