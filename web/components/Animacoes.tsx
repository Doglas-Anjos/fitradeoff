"use client";

/**
 * Os dois ícones que precisam explicar uma resposta sozinhos.
 *
 * "As duas valem o mesmo" e "não sei" não são A nem B — são respostas de outra
 * natureza, e um ícone genérico (uma barra, um ponto) não distingue uma da
 * outra. Estes dois desenham o que a resposta significa:
 *
 * - **cabo de guerra**: os dois lados puxam com a mesma força e o nó fica no
 *   meio. É a indiferença: não é falta de opinião, é o empate declarado.
 * - **dúvida**: a interrogação balança sem se decidir. É a saída de quem não
 *   sabe responder aquele par — que no método é distinta da indiferença,
 *   porque não afirma nada e não restringe nada.
 *
 * As animações vivem no `globals.css`, sob o `prefers-reduced-motion` global.
 * Parados, os dois desenhos continuam legíveis: o movimento acrescenta, não
 * carrega o significado sozinho.
 */

/** Dois lados puxando a mesma corda; o nó oscila sem sair do meio. */
export function CaboDeGuerra({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Dois lados empurrando contra uma linha que não cede.
          Não é o cabo de guerra literal, e isso foi uma escolha depois de duas
          tentativas: com barras nas pontas o desenho virava um halter -- o
          próprio ícone que este veio substituir -- e com a corda em ziguezague
          virava um laço. A 22px o desenho literal não sobrevive; o que sobrevive
          é a força de cada lado e o meio que fica parado, que é o significado. */}
      <line x1="3" y1="12" x2="8.6" y2="12" />
      <polyline points="6.2,9.6 8.8,12 6.2,14.4" />
      <line x1="21" y1="12" x2="15.4" y2="12" />
      <polyline points="17.8,9.6 15.2,12 17.8,14.4" />
      {/* O meio, que é o que se move -- pouco, e volta sempre. */}
      <line
        className="no-do-cabo"
        x1="12"
        y1="6.8"
        x2="12"
        y2="17.2"
        strokeWidth={2.2}
      />
    </svg>
  );
}

/** Uma figura com uma interrogação que balança em cima. */
export function BonecoEmDuvida({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* cabeça e ombros, à esquerda para abrir espaço à interrogação */}
      <circle cx="9" cy="12.5" r="3.1" />
      <path d="M3.6 21.5c0-3 2.4-4.7 5.4-4.7s5.4 1.7 5.4 4.7" />
      {/* a interrogação, que é o que se move */}
      <g className="duvida-interrogacao">
        <path d="M16.1 5.6a2.3 2.3 0 1 1 3 2.2c-.8.3-1.2.9-1.2 1.7" />
        <circle cx="17.9" cy="12.4" r="0.85" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
