-- Schema SQL para Supabase/Postgres (ACAD-SaaS)

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Módulo CORE ACADÊMICO (ERP)

-- Tabela: campi
CREATE TABLE public.campi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    endereco TEXT,
    cnpj VARCHAR(18) UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para campi
ALTER TABLE public.campi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.campi FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.campi FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.campi FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.campi FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: cursos
CREATE TABLE public.cursos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID REFERENCES public.campi(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    duracao_semestres INTEGER,
    modalidade VARCHAR(50), -- Ex: Presencial, EAD
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para cursos
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.cursos FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.cursos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.cursos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.cursos FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: periodos_letivos
CREATE TABLE public.periodos_letivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID REFERENCES public.campi(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (campus_id, ano, semestre)
);

-- RLS para periodos_letivos
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.periodos_letivos FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.periodos_letivos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.periodos_letivos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.periodos_letivos FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: matrizes_curriculares
CREATE TABLE public.matrizes_curriculares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    ano_vigencia INTEGER NOT NULL,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (curso_id, ano_vigencia)
);

-- RLS para matrizes_curriculares
ALTER TABLE public.matrizes_curriculares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.matrizes_curriculares FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.matrizes_curriculares FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.matrizes_curriculares FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.matrizes_curriculares FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: disciplinas
CREATE TABLE public.disciplinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    carga_horaria INTEGER NOT NULL,
    tipo VARCHAR(50), -- Ex: Teorica, Pratica, Teorico-Pratica
    ementa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para disciplinas
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.disciplinas FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.disciplinas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.disciplinas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.disciplinas FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: matriz_disciplinas (para pré-requisitos, co-requisitos, equivalências)
CREATE TABLE public.matriz_disciplinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matriz_curricular_id UUID REFERENCES public.matrizes_curriculares(id) ON DELETE CASCADE,
    disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    periodo_sugerido INTEGER,
    tipo_relacao VARCHAR(50), -- Ex: Obrigatoria, Optativa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (matriz_curricular_id, disciplina_id)
);

-- RLS para matriz_disciplinas
ALTER TABLE public.matriz_disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.matriz_disciplinas FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.matriz_disciplinas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.matriz_disciplinas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.matriz_disciplinas FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: pre_requisitos
CREATE TABLE public.pre_requisitos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matriz_disciplina_id UUID REFERENCES public.matriz_disciplinas(id) ON DELETE CASCADE,
    disciplina_pre_requisito_id UUID REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (matriz_disciplina_id, disciplina_pre_requisito_id)
);

-- RLS para pre_requisitos
ALTER TABLE public.pre_requisitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.pre_requisitos FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.pre_requisitos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.pre_requisitos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.pre_requisitos FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: alunos
CREATE TABLE public.alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para alunos
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.alunos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.alunos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable update for authenticated users" ON public.alunos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable delete for authenticated users" ON public.alunos FOR DELETE USING (auth.uid() = user_id);

-- Tabela: professores
CREATE TABLE public.professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para professores
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.professores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.professores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable update for authenticated users" ON public.professores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable delete for authenticated users" ON public.professores FOR DELETE USING (auth.uid() = user_id);

-- Tabela: turmas
CREATE TABLE public.turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    periodo_letivo_id UUID REFERENCES public.periodos_letivos(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
    codigo VARCHAR(50) NOT NULL,
    capacidade INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (disciplina_id, periodo_letivo_id, codigo)
);

-- RLS para turmas
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.turmas FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.turmas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.turmas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.turmas FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: matriculas
CREATE TABLE public.matriculas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
    data_matricula DATE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- Ex: Ativo, Trancado, Cancelado, Formado, Transferido, Evadido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (aluno_id, turma_id)
);

-- RLS para matriculas
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for students" ON public.matriculas FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable insert for authenticated users" ON public.matriculas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.matriculas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.matriculas FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: historico_notas
CREATE TABLE public.historico_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula_id UUID REFERENCES public.matriculas(id) ON DELETE CASCADE,
    tipo_avaliacao VARCHAR(100),
    nota DECIMAL(4,2),
    frequencia DECIMAL(5,2), -- Percentual de frequência
    data_lancamento DATE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para historico_notas
ALTER TABLE public.historico_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for students" ON public.historico_notas FOR SELECT USING (auth.uid() = (SELECT a.user_id FROM public.alunos a JOIN public.matriculas m ON a.id = m.aluno_id WHERE m.id = matricula_id));
CREATE POLICY "Enable insert for authenticated users" ON public.historico_notas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.historico_notas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.historico_notas FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: requerimentos
CREATE TABLE public.requerimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    tipo_requerimento VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'Pendente',
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_resposta TIMESTAMP WITH TIME ZONE,
    resposta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para requerimentos
ALTER TABLE public.requerimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for students" ON public.requerimentos FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable insert for students" ON public.requerimentos FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable update for students" ON public.requerimentos FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable delete for students" ON public.requerimentos FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));

-- Módulo SECRETARIA ACADÊMICA DIGITAL

-- Tabela: tipos_documento
CREATE TABLE public.tipos_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    temporalidade_anos INTEGER, -- Tempo de guarda em anos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para tipos_documento
ALTER TABLE public.tipos_documento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.tipos_documento FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.tipos_documento FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.tipos_documento FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.tipos_documento FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: documentos_acervo
CREATE TABLE public.documentos_acervo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento_id UUID REFERENCES public.tipos_documento(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    url_supabase TEXT NOT NULL, -- URL para o arquivo no Supabase Object Storage
    hash_sha256 VARCHAR(64) UNIQUE NOT NULL, -- Hash SHA-256 do documento
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_descarte_prevista DATE, -- Calculada com base na temporalidade
    assinado_eletronicamente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para documentos_acervo
ALTER TABLE public.documentos_acervo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for students" ON public.documentos_acervo FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable insert for authenticated users" ON public.documentos_acervo FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.documentos_acervo FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.documentos_acervo FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: logs_blockchain (para carimbo temporal)
CREATE TABLE public.logs_blockchain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES public.documentos_acervo(id) ON DELETE CASCADE,
    hash_documento VARCHAR(64) NOT NULL,
    timestamp_blockchain TIMESTAMP WITH TIME ZONE NOT NULL,
    tx_id VARCHAR(255) UNIQUE, -- ID da transação na blockchain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para logs_blockchain
ALTER TABLE public.logs_blockchain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.logs_blockchain FOR SELECT USING (TRUE);
CREATE POLICY "Enable insert for authenticated users" ON public.logs_blockchain FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Módulo DIPLOMA DIGITAL

-- Tabela: cofre_certificados
CREATE TABLE public.cofre_certificados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50), -- Ex: A1, A3, eCNPJ, eCPF
    conteudo_pfx BYTEA NOT NULL, -- Certificado .pfx criptografado
    senha_pfx TEXT NOT NULL, -- Senha do PFX (criptografada em ambiente real)
    data_validade DATE NOT NULL,
    emitente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para cofre_certificados
ALTER TABLE public.cofre_certificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.cofre_certificados FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.cofre_certificados FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.cofre_certificados FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.cofre_certificados FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela: diplomas_emitidos
CREATE TABLE public.diplomas_emitidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
    data_colacao DATE NOT NULL,
    numero_registro VARCHAR(255) UNIQUE NOT NULL,
    xml_mec TEXT NOT NULL, -- Conteúdo do XML do MEC
    url_rvdd TEXT NOT NULL, -- URL para o PDF da Representação Visual do Diploma Digital
    url_validador TEXT NOT NULL, -- URL pública para validação
    hash_xml VARCHAR(64) NOT NULL, -- Hash SHA-256 do XML
    certificado_id UUID REFERENCES public.cofre_certificados(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para diplomas_emitidos
ALTER TABLE public.diplomas_emitidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for students" ON public.diplomas_emitidos FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.alunos WHERE id = aluno_id));
CREATE POLICY "Enable read access for public validator" ON public.diplomas_emitidos FOR SELECT USING (TRUE); -- Acesso público para o validador
CREATE POLICY "Enable insert for authenticated users" ON public.diplomas_emitidos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.diplomas_emitidos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.diplomas_emitidos FOR DELETE USING (auth.role() = 'authenticated');

-- Função para atualizar `updated_at` automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para `updated_at`
CREATE TRIGGER update_campi_updated_at
BEFORE UPDATE ON public.campi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cursos_updated_at
BEFORE UPDATE ON public.cursos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periodos_letivos_updated_at
BEFORE UPDATE ON public.periodos_letivos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matrizes_curriculares_updated_at
BEFORE UPDATE ON public.matrizes_curriculares
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disciplinas_updated_at
BEFORE UPDATE ON public.disciplinas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matriz_disciplinas_updated_at
BEFORE UPDATE ON public.matriz_disciplinas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_requisitos_updated_at
BEFORE UPDATE ON public.pre_requisitos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alunos_updated_at
BEFORE UPDATE ON public.alunos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professores_updated_at
BEFORE UPDATE ON public.professores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matriculas_updated_at
BEFORE UPDATE ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historico_notas_updated_at
BEFORE UPDATE ON public.historico_notas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requerimentos_updated_at
BEFORE UPDATE ON public.requerimentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tipos_documento_updated_at
BEFORE UPDATE ON public.tipos_documento
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_acervo_updated_at
BEFORE UPDATE ON public.documentos_acervo
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cofre_certificados_updated_at
BEFORE UPDATE ON public.cofre_certificados
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diplomas_emitidos_updated_at
BEFORE UPDATE ON public.diplomas_emitidos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
