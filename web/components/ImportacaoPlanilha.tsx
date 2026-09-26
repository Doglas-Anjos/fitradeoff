"use client";

/**
 * Subir a planilha: arquivo, arrastado ou colado direto do Excel.
 *
 * Extraido da entrada do problema quando o cadastro virou uma sequencia de
 * telas: importar e um caminho inteiro -- escolher o arquivo, conferir o que
 * foi lido, e so entao gravar -- e nao uma aba ao lado de um formulario.
 *
 * Nada aqui grava nada. A leitura volta para conferencia, que e outra tela.
 */

import {
  CheckCircle,
  ClipboardText,
  DownloadSimple,
  FileArrowUp,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Botao, Dica, PESO_ICONE } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";

export function ImportacaoPlanilha({
  ocupado,
  arquivoLido,
  erro,
  onLer,
}: {
  ocupado: boolean;
  arquivoLido: string | null;
  erro?: string | null;
  onLer: (entrada: File | string) => void;
}) {
  const { t } = useIdioma();
  const [arrastando, setArrastando] = useState(false);
  const [colado, setColado] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <a
        href="/api/modelo-planilha"
        className="tatil inline-flex items-center gap-2 rounded-[var(--raio-controle)] border px-4 py-2 text-sm font-medium"
        style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
      >
        <DownloadSimple size={16} weight={PESO_ICONE > 1 ? "regular" : "bold"} />
        {t("importacao.modelo")}
      </a>

      {/* área de soltar: o alvo é a área inteira, não só o botão */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files?.[0];
          if (arquivo) onLer(arquivo);
        }}
        className="rounded-[var(--raio-painel)] border-2 border-dashed p-8 text-center transition-colors"
        style={{
          borderColor: arrastando ? "var(--accent)" : "var(--borda-forte)",
          background: arrastando ? "var(--accent-suave)" : "var(--painel)",
        }}
      >
        {ocupado ? (
          <>
            <div className="esqueleto mx-auto h-8 w-8 rounded-full" />
            <p className="mt-3 text-sm" style={{ color: "var(--tinta-2)" }}>
              {t("importacao.lendo", { arquivo: arquivoLido ?? "" })}
            </p>
          </>
        ) : (
          <>
            <FileArrowUp
              size={30}
              weight="regular"
              style={{ color: arrastando ? "var(--accent)" : "var(--tinta-fraca)" }}
              className="mx-auto"
            />
            <p className="mt-3 text-sm" style={{ color: "var(--tinta)" }}>
              {t("importacao.arraste")}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
              {t("importacao.formatos")}
            </p>
            <Botao
              variante="contorno"
              onClick={() => inputArquivo.current?.click()}
              className="mt-4"
            >
              {t("importacao.escolher")}
            </Botao>
            <input
              ref={inputArquivo}
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              className="sr-only"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) onLer(arquivo);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {/* Colar é o caminho mais curto: selecionar no Excel e colar aqui. Não
          precisa salvar arquivo, nem achar onde ele foi parar. A área de
          transferência do Excel vem tabulada, que o leitor reconhece. */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <ClipboardText size={15} style={{ color: "var(--tinta-3)" }} />
          <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
            {t("importacao.colar.titulo")}
          </span>
          <Dica titulo={t("importacao.colar.dica.titulo")}>
            {/* direcao e unidade sao palavras-chave da planilha: ficam como
                estao nos dois idiomas, porque o leitor as procura assim. */}
            <p>
              {t("importacao.colar.dica.corpo1.antes")}
              <strong>{t("importacao.colar.dica.corpo1.cabecalho")}</strong>
              {t("importacao.colar.dica.corpo1.meio")}
              <code>direcao</code>
              {t("importacao.colar.dica.corpo1.e")}
              <code>unidade</code>
              {t("importacao.colar.dica.corpo1.depois")}
            </p>
            <p style={{ color: "var(--tinta-3)" }}>
              {t("importacao.colar.dica.corpo2")}
            </p>
          </Dica>
        </div>
        <textarea
          value={colado}
          onChange={(e) => setColado(e.target.value)}
          onPaste={(e) => {
            /* Colar já é a confirmação: ninguém cola uma planilha para depois
               clicar em "ler". O texto vai direto para a leitura. */
            const texto = e.clipboardData.getData("text");
            if (texto.trim()) {
              e.preventDefault();
              setColado(texto);
              onLer(texto);
            }
          }}
          disabled={ocupado}
          rows={4}
          placeholder={[
            `criterio\t${t("importacao.exemplo.custo")}\t${t("importacao.exemplo.prazo")}`,
            "direcao\tmin\tmin",
            `${t("importacao.exemplo.fornecedor")}\t120\t30`,
          ].join("\n")}
          aria-label={t("importacao.colar.rotulo")}
          className="tatil num w-full rounded-[var(--raio-controle)] border p-3 text-[12.5px] outline-none disabled:opacity-50"
          style={{
            borderColor: "var(--borda-forte)",
            background: "var(--painel)",
            color: "var(--tinta)",
          }}
        />
        {colado.trim() && (
          <Botao
            variante="contorno"
            onClick={() => onLer(colado)}
            disabled={ocupado}
            className="mt-2"
          >
            {t("importacao.lerColado")}
          </Botao>
        )}
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-[var(--raio-controle)] border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--erro)",
            background: "var(--erro-suave)",
            color: "var(--erro)",
          }}
        >
          {erro}
        </div>
      )}

      <div
        className="rounded-[var(--raio-painel)] border p-4"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <p
          className="mb-3 flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: "var(--tinta)" }}
        >
          <CheckCircle size={15} weight="fill" style={{ color: "var(--sucesso)" }} />
          {t("importacao.requisitos.titulo")}
        </p>
        <table className="num w-full text-[11px]">
          <tbody>
            {[
              [
                t("estrutura.problema.nome.exemplo"),
                t("importacao.exemplo.qualidade"),
                t("importacao.exemplo.custo"),
                t("importacao.exemplo.prazo"),
              ],
              ["direcao", "max", "min", "min"],
              [
                "unidade",
                "",
                t("estrutura.criterio.unidade.exemplo"),
                t("importacao.exemplo.dias"),
              ],
              [t("importacao.exemplo.fornecedor"), "0.82", "12.5", "30"],
            ].map((linha, i) => (
              <tr key={i}>
                {linha.map((celula, j) => (
                  <td
                    key={j}
                    className="border px-2 py-1"
                    style={{
                      borderColor: "var(--borda)",
                      color: i < 3 && j === 0 ? "var(--accent)" : "var(--tinta-2)",
                      background: i === 0 ? "var(--painel-fundo)" : "transparent",
                    }}
                  >
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {t("importacao.requisitos.nota.antes")}
          <strong>direcao</strong>
          {t("importacao.requisitos.nota.depois")}
        </p>
      </div>
    </div>
  );
}
