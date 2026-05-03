export function AssessmentCards({ cards }) {
  return (
    <div className="cards">
      {cards.map((card) => (
        <div key={card.id} className="card" data-severity={card.severity}>
          <div className="card__title">{card.title}</div>
          <div className="card__why">{card.why}</div>
          <div className="card__action">→ {card.action}</div>
        </div>
      ))}
    </div>
  );
}
