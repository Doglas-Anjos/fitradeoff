/* O cartão de cada seção da condução: título à esquerda, um acessório opcional
   (voltar, salvar, encerrar) à direita. */
export function Secao({
  titulo,
  acessorio,
  children,
}: {
  titulo: string;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="cartao-secao">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--tinta)" }}
        >
          {titulo}
        </h2>
        {acessorio}
      </div>
      {children}
    </section>
  );
}
