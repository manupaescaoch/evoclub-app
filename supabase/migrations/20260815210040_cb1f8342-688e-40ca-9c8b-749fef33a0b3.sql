alter table public.training_methods
  add column if not exists category text,
  add column if not exists params jsonb not null default '[]'::jsonb,
  add column if not exists display_template text;

with presets(code, params) as (
  values
    ('trad','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"text"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('pir','[{"key":"series","label":"Séries","type":"number"},{"key":"reps_start","label":"Reps iniciais","type":"number"},{"key":"reps_step","label":"Variação de reps","type":"number"},{"key":"load_step_pct","label":"Variação de carga (%)","type":"number"}]'::jsonb),
    ('drop','[{"key":"reps","label":"Reps da série base","type":"number"},{"key":"drops","label":"Nº de quedas","type":"number"},{"key":"drop_pct","label":"Redução por queda (%)","type":"number"},{"key":"drop_reps","label":"Reps por queda","type":"text"}]'::jsonb),
    ('mechdrop','[{"key":"reps","label":"Reps por variação","type":"number"},{"key":"variations","label":"Nº de variações","type":"number"},{"key":"note","label":"Ordem das variações","type":"text"}]'::jsonb),
    ('restpause','[{"key":"reps","label":"Reps da série base","type":"number"},{"key":"pause_s","label":"Pausa (s)","type":"number"},{"key":"minis","label":"Nº de mini-séries","type":"number"},{"key":"mini_reps","label":"Reps por mini-série","type":"number"}]'::jsonb),
    ('myo','[{"key":"reps","label":"Reps de ativação","type":"number"},{"key":"pause_s","label":"Pausa (s)","type":"number"},{"key":"minis","label":"Nº de mini-séries","type":"number"},{"key":"mini_reps","label":"Reps por mini-série","type":"number"}]'::jsonb),
    ('cluster','[{"key":"blocks","label":"Blocos","type":"number"},{"key":"block_reps","label":"Reps por bloco","type":"number"},{"key":"micro_rest_s","label":"Micropausa (s)","type":"number"}]'::jsonb),
    ('multi','[{"key":"exercises","label":"Nº de exercícios","type":"number"},{"key":"reps","label":"Reps por exercício","type":"text"},{"key":"rest_between_s","label":"Descanso entre exercícios (s)","type":"number"},{"key":"rest_s","label":"Descanso ao fim do bloco (s)","type":"number"}]'::jsonb),
    ('circ','[{"key":"stations","label":"Nº de estações","type":"number"},{"key":"work_s","label":"Trabalho por estação (s)","type":"number"},{"key":"rest_s","label":"Descanso entre estações (s)","type":"number"},{"key":"rounds","label":"Rodadas","type":"number"}]'::jsonb),
    ('exhaust','[{"key":"first_exercise","label":"1º exercício","type":"text"},{"key":"second_exercise","label":"2º exercício","type":"text"},{"key":"reps","label":"Reps por exercício","type":"text"},{"key":"rest_s","label":"Descanso ao fim (s)","type":"number"}]'::jsonb),
    ('partial','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"range","label":"Amplitude trabalhada","type":"text"}]'::jsonb),
    ('iso','[{"key":"series","label":"Séries","type":"number"},{"key":"hold_s","label":"Tempo de sustentação (s)","type":"number"},{"key":"position","label":"Posição","type":"text"}]'::jsonb),
    ('isopost','[{"key":"reps","label":"Repetições","type":"number"},{"key":"hold_s","label":"Isometria final (s)","type":"number"},{"key":"position","label":"Posição","type":"text"}]'::jsonb),
    ('pausa','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"pause_s","label":"Pausa por repetição (s)","type":"number"}]'::jsonb),
    ('tempo','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"ecc_s","label":"Excêntrica (s)","type":"number"},{"key":"pause_s","label":"Pausa (s)","type":"number"},{"key":"con_s","label":"Concêntrica (s)","type":"number"}]'::jsonb),
    ('half','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições completas","type":"number"},{"key":"note","label":"Onde fazer a meia repetição","type":"text"}]'::jsonb),
    ('21s','[{"key":"series","label":"Séries","type":"number"},{"key":"block_reps","label":"Reps por bloco","type":"number"}]'::jsonb),
    ('failure','[{"key":"series","label":"Séries","type":"number"},{"key":"reps_target","label":"Reps alvo","type":"text"}]'::jsonb),
    ('rir','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"text"},{"key":"rir","label":"RIR alvo","type":"number"}]'::jsonb),
    ('rpe','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"text"},{"key":"rpe","label":"RPE alvo","type":"number"}]'::jsonb),
    ('amrap','[{"key":"duration_min","label":"Duração (min)","type":"number"},{"key":"reps_target","label":"Meta de reps","type":"text"}]'::jsonb),
    ('emom','[{"key":"minutes","label":"Minutos","type":"number"},{"key":"reps_per_min","label":"Reps por minuto","type":"number"}]'::jsonb),
    ('fortime','[{"key":"total_reps","label":"Volume total","type":"text"},{"key":"time_cap_min","label":"Tempo limite (min)","type":"number"}]'::jsonb),
    ('escada','[{"key":"reps_start","label":"Reps iniciais","type":"number"},{"key":"reps_end","label":"Reps finais","type":"number"},{"key":"step","label":"Passo","type":"number"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('ondul','[{"key":"series","label":"Séries","type":"number"},{"key":"scheme","label":"Sequência de reps/cargas","type":"text"}]'::jsonb),
    ('topset','[{"key":"warmups","label":"Séries de aproximação","type":"number"},{"key":"top_reps","label":"Reps da série principal","type":"number"},{"key":"top_rpe","label":"RPE/RIR da principal","type":"text"}]'::jsonb),
    ('backoff','[{"key":"series","label":"Séries de back-off","type":"number"},{"key":"reps","label":"Repetições","type":"text"},{"key":"load_drop_pct","label":"Redução de carga (%)","type":"number"}]'::jsonb),
    ('topbackoff','[{"key":"top_reps","label":"Reps da série principal","type":"number"},{"key":"backoff_series","label":"Séries de back-off","type":"number"},{"key":"backoff_reps","label":"Reps do back-off","type":"text"},{"key":"load_drop_pct","label":"Redução de carga (%)","type":"number"}]'::jsonb),
    ('rampup','[{"key":"series","label":"Séries de aproximação","type":"number"},{"key":"reps","label":"Repetições","type":"text"},{"key":"load_step_pct","label":"Incremento de carga (%)","type":"number"}]'::jsonb),
    ('forced','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"forced_reps","label":"Reps forçadas","type":"number"}]'::jsonb),
    ('neg','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"ecc_s","label":"Tempo da excêntrica (s)","type":"number"}]'::jsonb),
    ('preativ','[{"key":"prep_exercise","label":"Exercício de preparação","type":"text"},{"key":"prep_reps","label":"Reps da preparação","type":"text"},{"key":"main_reps","label":"Reps do principal","type":"text"},{"key":"rest_s","label":"Descanso entre eles (s)","type":"number"}]'::jsonb),
    ('contrast','[{"key":"heavy_reps","label":"Reps do pesado","type":"number"},{"key":"explosive_reps","label":"Reps do explosivo","type":"number"},{"key":"rest_s","label":"Descanso entre eles (s)","type":"number"},{"key":"rounds","label":"Rodadas","type":"number"}]'::jsonb),
    ('unilat','[{"key":"series","label":"Séries","type":"number"},{"key":"reps_per_side","label":"Reps por lado","type":"number"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('densidade','[{"key":"duration_min","label":"Tempo total (min)","type":"number"},{"key":"target_series","label":"Meta de séries","type":"number"},{"key":"reps","label":"Repetições","type":"text"}]'::jsonb),
    ('voltotal','[{"key":"total_reps","label":"Repetições totais","type":"number"},{"key":"reps_per_set","label":"Reps por série (sugestão)","type":"text"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('timed','[{"key":"series","label":"Séries","type":"number"},{"key":"work_s","label":"Tempo de trabalho (s)","type":"number"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('tut','[{"key":"series","label":"Séries","type":"number"},{"key":"tut_s","label":"Tempo sob tensão por série (s)","type":"number"}]'::jsonb),
    ('deadstop','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"stop_s","label":"Parada por repetição (s)","type":"number"}]'::jsonb),
    ('bfr','[{"key":"cuff_pct","label":"Pressão do manguito (%)","type":"number"},{"key":"load_pct","label":"Carga (% 1RM)","type":"number"},{"key":"first_set_reps","label":"Reps da 1ª série","type":"number"},{"key":"next_sets","label":"Séries seguintes (reps)","type":"text"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('fixed','[{"key":"series","label":"Séries","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('fst7','[{"key":"series","label":"Séries finais","type":"number"},{"key":"reps","label":"Repetições","type":"number"},{"key":"rest_s","label":"Descanso (s)","type":"number"}]'::jsonb),
    ('progress','[{"key":"criteria","label":"Critério para progredir","type":"text"},{"key":"increment","label":"Incremento","type":"text"},{"key":"rep_range","label":"Faixa de repetições","type":"text"}]'::jsonb)
),
novos(name, description, category, preset, display_template) as (
  values
    ('Séries tradicionais','Execução de séries com descanso completo entre elas, mantendo carga e faixa de repetições definidas.','Estrutura de séries','trad','{series}x{reps} · descanso {rest_s}s'),
    ('Straight sets','Todas as séries são realizadas com aproximadamente a mesma carga e repetições.','Estrutura de séries','trad','{series}x{reps} com mesma carga · descanso {rest_s}s'),
    ('Pirâmide crescente','A carga aumenta a cada série enquanto o número de repetições diminui.','Pirâmides','pir','{series} séries · começa em {reps_start} reps, -{reps_step} reps e +{load_step_pct}% carga por série'),
    ('Pirâmide decrescente','A carga diminui progressivamente enquanto o número de repetições aumenta.','Pirâmides','pir','{series} séries · começa em {reps_start} reps, +{reps_step} reps e -{load_step_pct}% carga por série'),
    ('Pirâmide completa','Combina aumento e depois redução de carga ao longo das séries.','Pirâmides','pir','{series} séries subindo e descendo carga ({load_step_pct}% por série)'),
    ('Drop-set','Após atingir a meta ou falha, reduz-se a carga e continua-se o exercício sem descanso significativo.','Drop-sets','drop','{reps} reps + {drops} queda(s) de {drop_pct}% ({drop_reps})'),
    ('Drop-set duplo','São realizadas duas reduções consecutivas de carga na mesma série.','Drop-sets','drop','{reps} reps + 2 quedas de {drop_pct}% ({drop_reps})'),
    ('Drop-set triplo','São realizadas três reduções consecutivas de carga após a série inicial.','Drop-sets','drop','{reps} reps + 3 quedas de {drop_pct}% ({drop_reps})'),
    ('Mechanical drop-set','Mantém-se a carga, mas muda-se a execução ou exercício para uma posição mecanicamente mais favorável.','Drop-sets','mechdrop','{variations} variações × {reps} reps · {note}'),
    ('Rest-pause','Realiza-se uma série próxima da falha, descansa-se por poucos segundos e executam-se novas repetições.','Intensificadores','restpause','{reps} reps + {minis}x ({pause_s}s + {mini_reps} reps)'),
    ('Myo-reps','Após uma série de ativação, são feitas pequenas séries com descansos muito curtos.','Intensificadores','myo','ativação {reps} reps + {minis}x ({pause_s}s + {mini_reps} reps)'),
    ('Cluster set','A série é dividida em pequenos blocos de repetições com micropausas entre eles.','Intensificadores','cluster','{blocks}x{block_reps} reps com {micro_rest_s}s de micropausa'),
    ('Superset agonista','Dois exercícios para o mesmo grupo muscular são executados em sequência, sem descanso entre eles.','Combinações','multi','2 exercícios seguidos · {reps} reps · descanso {rest_s}s'),
    ('Superset antagonista','Dois exercícios para músculos opostos são realizados em sequência, como bíceps e tríceps.','Combinações','multi','2 exercícios opostos seguidos · {reps} reps · descanso {rest_s}s'),
    ('Bi-set','Dois exercícios para o mesmo grupo muscular executados consecutivamente.','Combinações','multi','2 exercícios seguidos · {reps} reps · descanso {rest_s}s'),
    ('Tri-set','Três exercícios para o mesmo grupo muscular realizados em sequência.','Combinações','multi','3 exercícios seguidos · {reps} reps · descanso {rest_s}s'),
    ('Giant set','Quatro ou mais exercícios para o mesmo grupo muscular realizados em sequência.','Combinações','multi','{exercises} exercícios seguidos · {reps} reps · descanso {rest_s}s'),
    ('Circuito','Sequência de diferentes exercícios com pouco ou nenhum descanso entre eles.','Combinações','circ','{rounds} rodadas · {stations} estações de {work_s}s · {rest_s}s entre estações'),
    ('Séries conjugadas','Alterna exercícios diferentes mantendo uma lógica específica de objetivo ou grupamento muscular.','Combinações','multi','{exercises} exercícios alternados · {reps} reps · descanso {rest_s}s'),
    ('Pré-exaustão','Um exercício isolador é realizado antes de um exercício composto para aumentar a fadiga do músculo-alvo.','Combinações','exhaust','{first_exercise} (isolador) → {second_exercise} (composto) · {reps} reps'),
    ('Pós-exaustão','Um exercício composto é seguido imediatamente por um exercício isolador para o mesmo músculo.','Combinações','exhaust','{first_exercise} (composto) → {second_exercise} (isolador) · {reps} reps'),
    ('Repetições parciais','São executadas repetições utilizando apenas parte da amplitude do movimento.','Amplitude','partial','{series}x{reps} parciais · {range}'),
    ('Parciais no alongamento','Repetições parciais realizadas predominantemente na região mais alongada do músculo.','Amplitude','partial','{series}x{reps} parciais na fase alongada'),
    ('Parciais na contração','Repetições executadas apenas na parte final do movimento, próxima da contração máxima.','Amplitude','partial','{series}x{reps} parciais na contração'),
    ('Isometria','Manutenção de uma posição estática sob tensão durante determinado tempo.','Isometria','iso','{series}x {hold_s}s em isometria · {position}'),
    ('Isometria pós-série','Após as repetições dinâmicas, mantém-se o músculo sob tensão em posição específica.','Isometria','isopost','{reps} reps + {hold_s}s de isometria ({position})'),
    ('Pausa no alongamento','Inclui uma pausa controlada no ponto de maior alongamento muscular.','Tempo e cadência','pausa','{series}x{reps} com {pause_s}s de pausa no alongamento'),
    ('Pausa na contração','Inclui uma pausa intencional na posição de maior encurtamento muscular.','Tempo e cadência','pausa','{series}x{reps} com {pause_s}s de pausa na contração'),
    ('Tempo controlado','Determina a duração das fases excêntrica, pausa e concêntrica do movimento.','Tempo e cadência','tempo','{series}x{reps} · cadência {ecc_s}-{pause_s}-{con_s}'),
    ('Excêntrica lenta','A fase de descida do movimento é realizada de maneira propositalmente mais lenta.','Tempo e cadência','tempo','{series}x{reps} · descida em {ecc_s}s'),
    ('Concêntrica explosiva','A fase de subida é executada com intenção máxima de velocidade, mantendo a técnica.','Tempo e cadência','tempo','{series}x{reps} · subida explosiva, descida {ecc_s}s'),
    ('Repetição pausada','Cada repetição possui uma pausa definida em algum ponto do movimento.','Tempo e cadência','pausa','{series}x{reps} com {pause_s}s de pausa por repetição'),
    ('1½ repetição','Cada repetição completa é combinada com uma meia repetição adicional.','Amplitude','half','{series}x{reps} reps 1½ · {note}'),
    ('Repetições 21','A série é dividida em três blocos de sete repetições usando amplitudes diferentes.','Amplitude','21s','{series} séries · 3 blocos de {block_reps} reps (parcial baixa, parcial alta, completa)'),
    ('Falha concêntrica','A série continua até não ser possível completar outra repetição com técnica adequada.','Intensidade','failure','{series} séries até a falha ({reps_target})'),
    ('Próximo da falha','A série termina mantendo uma pequena quantidade de repetições possíveis em reserva.','Intensidade','rir','{series}x{reps} · parar com RIR {rir}'),
    ('RIR','Intensidade prescrita pela quantidade estimada de repetições que ainda poderiam ser realizadas.','Intensidade','rir','{series}x{reps} · RIR {rir}'),
    ('RPE','Intensidade determinada pela percepção subjetiva de esforço do praticante.','Intensidade','rpe','{series}x{reps} · RPE {rpe}'),
    ('Ponto de falha técnica','A série é encerrada quando a técnica começa a deteriorar, mesmo que ainda fosse possível mover a carga.','Intensidade','failure','{series} séries até a falha técnica ({reps_target})'),
    ('Repetições em reserva fixa','Todas as séries são interrompidas mantendo o mesmo RIR previamente determinado.','Intensidade','rir','{series}x{reps} · todas com RIR {rir}'),
    ('AMRAP','Realizar o maior número possível de repetições dentro das regras estabelecidas.','Blocos por tempo','amrap','AMRAP {duration_min} min · meta {reps_target}'),
    ('EMOM','Um bloco de exercício começa a cada minuto, usando o tempo restante como descanso.','Blocos por tempo','emom','EMOM {minutes} min · {reps_per_min} reps por minuto'),
    ('For time','Determinado volume de trabalho deve ser concluído no menor tempo possível.','Blocos por tempo','fortime','{total_reps} no menor tempo · limite {time_cap_min} min'),
    ('Série cronometrada','O exercício é executado durante determinado período em vez de utilizar número fixo de repetições.','Blocos por tempo','timed','{series}x {work_s}s de trabalho · descanso {rest_s}s'),
    ('TUT','Prescrição baseada no tempo total em que o músculo permanece sob tensão.','Blocos por tempo','tut','{series} séries · {tut_s}s sob tensão por série'),
    ('Densidade','Busca realizar determinado volume em menos tempo ou mais trabalho no mesmo intervalo.','Blocos por tempo','densidade','{target_series} séries de {reps} reps em {duration_min} min'),
    ('Volume alvo','O objetivo é completar uma quantidade pré-estabelecida de séries ou repetições totais.','Volume','voltotal','meta de {total_reps} reps · {reps_per_set} por série'),
    ('Repetições totais','Define-se uma meta total de repetições independentemente da quantidade exata de séries necessárias.','Volume','voltotal','{total_reps} reps totais em quantas séries precisar · descanso {rest_s}s'),
    ('Escada crescente','As repetições aumentam progressivamente a cada rodada ou série.','Escadas','escada','de {reps_start} a {reps_end} reps (+{step} por série)'),
    ('Escada decrescente','As repetições diminuem progressivamente a cada rodada ou série.','Escadas','escada','de {reps_start} a {reps_end} reps (-{step} por série)'),
    ('Escada crescente/decrescente','As repetições sobem até determinado valor e depois retornam progressivamente.','Escadas','escada','sobe até {reps_end} reps e volta a {reps_start} (passo {step})'),
    ('Ondulatória de repetições','As repetições e/ou cargas variam de uma série para outra sem progressão linear.','Escadas','ondul','{series} séries · {scheme}'),
    ('Série descendente de repetições','Mantém-se ou ajusta-se a carga enquanto as repetições diminuem entre séries.','Escadas','ondul','{series} séries com reps decrescentes · {scheme}'),
    ('Série ascendente de repetições','As repetições aumentam progressivamente ao longo das séries.','Escadas','ondul','{series} séries com reps crescentes · {scheme}'),
    ('Top set','Uma série principal mais pesada é realizada após o aquecimento.','Top set e back-off','topset','{warmups} aproximações + top set de {top_reps} reps ({top_rpe})'),
    ('Back-off sets','Séries realizadas com carga reduzida após uma série principal pesada.','Top set e back-off','backoff','{series}x{reps} com -{load_drop_pct}% da carga do top set'),
    ('Top set + back-off','Combina uma série pesada principal com séries posteriores usando carga menor.','Top set e back-off','topbackoff','top set {top_reps} reps + {backoff_series}x{backoff_reps} com -{load_drop_pct}%'),
    ('Série de aproximação','Séries preparatórias progressivas usadas antes das séries efetivas.','Top set e back-off','rampup','{series} aproximações de {reps} reps · +{load_step_pct}% por série'),
    ('Repetições forçadas','Após a falha, um parceiro auxilia minimamente para permitir repetições adicionais.','Intensificadores','forced','{series}x{reps} + {forced_reps} reps forçadas'),
    ('Negativas assistidas','O praticante recebe ajuda na fase concêntrica e controla sozinho a fase excêntrica.','Intensificadores','neg','{series}x{reps} negativas de {ecc_s}s'),
    ('Pré-ativação','Exercício específico é utilizado antes do principal para aumentar percepção ou recrutamento do músculo-alvo.','Potência e ativação','preativ','{prep_exercise} ({prep_reps}) → principal {main_reps}'),
    ('Potencialização','Um exercício pesado ou explosivo é utilizado antes de outro movimento para aumentar temporariamente o desempenho.','Potência e ativação','contrast','{heavy_reps} reps pesadas → {explosive_reps} reps explosivas · {rounds} rodadas'),
    ('Contraste','Alterna exercício pesado com exercício explosivo de padrão semelhante.','Potência e ativação','contrast','{heavy_reps} pesadas + {explosive_reps} explosivas · {rounds} rodadas · {rest_s}s'),
    ('Complex training','Combina exercícios de força e potência biomecanicamente relacionados.','Potência e ativação','contrast','força {heavy_reps} reps → potência {explosive_reps} reps · {rounds} rodadas'),
    ('Série unilateral alternada','Um lado é executado e depois o outro, podendo o lado oposto descansar durante a execução.','Unilateral','unilat','{series}x{reps_per_side} por lado, alternando'),
    ('Unilateral contínuo','Todas as séries ou repetições de um lado são realizadas antes da troca para o lado oposto.','Unilateral','unilat','{series}x{reps_per_side} de um lado, depois troca'),
    ('Repetições alternadas','Os lados alternam a cada repetição, como em uma rosca alternada.','Unilateral','unilat','{series}x{reps_per_side} por lado, alternando a cada repetição'),
    ('Ponto zero / pausa no ponto morto','Remove o efeito elástico ao fazer uma pausa antes de iniciar a fase concêntrica.','Tempo e cadência','deadstop','{series}x{reps} com {stop_s}s parado antes de subir'),
    ('Dead-stop','Cada repetição começa a partir de uma parada completa, reduzindo o aproveitamento do ciclo alongamento-encurtamento.','Tempo e cadência','deadstop','{series}x{reps} com parada completa de {stop_s}s'),
    ('BFR / restrição de fluxo','Utiliza manguitos para restringir parcialmente o fluxo sanguíneo durante exercícios com cargas leves.','Métodos especiais','bfr','manguito {cuff_pct}% · carga {load_pct}% · {first_set_reps} + {next_sets} · {rest_s}s'),
    ('FST-7','Geralmente utiliza sete séries finais com descansos curtos para gerar alto estresse metabólico.','Métodos especiais','fst7','{series}x{reps} finais com {rest_s}s de descanso'),
    ('German Volume Training','Método clássico baseado em alto volume, tradicionalmente com 10 séries de 10 repetições.','Métodos clássicos','fixed','{series}x{reps} · descanso {rest_s}s'),
    ('5x5','Método de força baseado geralmente em cinco séries de cinco repetições com cargas relativamente altas.','Métodos clássicos','fixed','{series}x{reps} · descanso {rest_s}s'),
    ('3x10','Estrutura tradicional de três séries de dez repetições.','Métodos clássicos','fixed','{series}x{reps} · descanso {rest_s}s'),
    ('4x8','Estrutura de quatro séries de oito repetições, normalmente com foco em hipertrofia/força moderada.','Métodos clássicos','fixed','{series}x{reps} · descanso {rest_s}s'),
    ('10x3','Alto número de séries com poucas repetições, favorecendo qualidade técnica e cargas maiores.','Métodos clássicos','fixed','{series}x{reps} · descanso {rest_s}s'),
    ('Dupla progressão','Primeiro aumenta-se o número de repetições dentro de uma faixa; depois, aumenta-se a carga.','Progressão','progress','faixa {rep_range} · ao atingir o topo, +{increment} ({criteria})'),
    ('Progressão de carga','A carga é aumentada progressivamente conforme o aluno atinge os critérios estabelecidos.','Progressão','progress','+{increment} de carga quando {criteria}'),
    ('Progressão de repetições','Mantém-se a carga e aumenta-se gradualmente a quantidade de repetições.','Progressão','progress','mesma carga · +{increment} reps quando {criteria} (faixa {rep_range})'),
    ('Progressão de séries','O volume aumenta ao adicionar séries ao exercício ao longo do tempo.','Progressão','progress','+{increment} série quando {criteria}')
),
final as (
  select n.name, n.description, n.category, n.display_template, coalesce(p.params, '[]'::jsonb) as params
  from novos n left join presets p on p.code = n.preset
)
insert into public.training_methods (name, description, category, params, display_template, is_global)
select f.name, f.description, f.category, f.params, f.display_template, true
from final f
where not exists (
  select 1 from public.training_methods m where lower(m.name) = lower(f.name)
);

with presets(code, params) as (
  select code, params from (values (null::text, null::jsonb)) t(code, params) where false
)
select 1;

update public.training_methods m
set description = coalesce(m.description, f.description),
    category = coalesce(m.category, f.category),
    display_template = coalesce(m.display_template, f.display_template),
    params = case when m.params = '[]'::jsonb then f.params else m.params end
from (
  select tm.name, tm.description, tm.category, tm.display_template, tm.params
  from public.training_methods tm
  where tm.is_global
) f
where lower(m.name) = lower(f.name) and m.id <> (select id from public.training_methods x where lower(x.name) = lower(f.name) order by created_at limit 1);