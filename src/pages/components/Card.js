import React from "react";

const Cards = () => {
  const cards = [
    {
      title: "Godt Humør",
      emojie: "🌞",
      description: "Vi forventer at du medbringer ja-hatten og har godt humør hele dagen. Ingen gider at være sure jo!",
      className: "card-humor",
    },
    {
      title: "Møde Til Tiden",
      emojie: "⏰",
      description: "Det er vigtigt, at du kommer til tiden, så alt kan starte som planlagt og uden stress.",
      className: "card-time",
    },
    {
      title: "Samarbejdsvilje",
      emojie: "🤝",
      description: "Vi arbejder som et team og hjælper hinanden, hvor der er brug for det.",
      className: "card-teamwork",
    },
    {
      title: "Ansvarlighed",
      emojie: "💪",
      description: "Du tager ansvar for den opgave, du har tilmeldt dig, og følger den til dørs.",
      className: "card-responsibility",
    },
    {
      title: "Fleksibilitet",
      emojie: "🔄",
      description: "Ting kan ændre sig undervejs, og derfor er fleksibilitet altid værdsat.",
      className: "card-flexibility",
    },
  ];

  return (
    <div className="cards-container">
      {cards.map((card, index) => (
        <div key={index} className="card-wrapper">
          <div className={`book ${card.className}`}>
            <p className="font-montserrat w-10/12 font-semibold">{card.description}</p>
            <div className="cover flex-col gap-3">
              <p className="font-bebas text-2xl  font-semibold">{card.title}</p>
              <p className="font-bebas text-4xl  font-semibold">{card.emojie}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Cards;
