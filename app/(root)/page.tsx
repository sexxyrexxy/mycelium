"use client"; // For build error handling

import { useState } from "react";
import "../assets/styles/globals.css";
import Image from "next/image";
import MushroomCard from "@/components/shared/mushroom/mushroom-card";

export default function Homepage() {
  const [search, setSearch] = useState("");

  const mushrooms = [
    {
      name: "Oyster",
      species: "Pleurotus ostreatus",
      description:
        "Delicate, fan-shaped mushrooms often found on decaying wood.",
    },
    {
      name: "Shiitake",
      species: "Lentinula edodes",
      description: "Savory, meaty mushrooms prized in Asian cuisine.",
    },
    {
      name: "Velvet Shank",
      species: "Flammulina velutipes",
      description: "Slim, winter-loving mushrooms that grow on tree trunks.",
    },
    {
      name: "Puffball",
      species: "Lycoperdon perlatum",
      description: "Round fungi that release spores when mature.",
    },
    {
      name: "Fly Agaric",
      species: "Amanita muscaria",
      description: "Iconic red mushroom with white spots, toxic but striking.",
    },
    {
      name: "Porcini",
      species: "Boletus edulis",
      description: "Nutty, flavorful mushrooms highly sought after by chefs.",
    },
  ].map((m) => ({
    ...m,
    img: `/images/${m.name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
  }));

  const filteredMushrooms = mushrooms.filter(
    (m) =>
      m.name.toLowerCase().startsWith(search.toLowerCase()) ||
      m.species.toLowerCase().startsWith(search.toLowerCase())
  );

  return (
    <>
      {/* Homepage Section */}
      <div className="h-[500px] relative">
        <Image
          src="/images/background-mushroom.jpg"
          alt="Mushroom Background"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
          <h1 className="font-bold text-5xl drop-shadow-lg">Find A Mushroom</h1>

          {/* Search Box */}
          <div className="mt-6 inline-flex bg-white rounded-full overflow-hidden opacity-70">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mushrooms..."
              className="px-4 py-2 outline-none text-black"
            />
            <button className="px-4 bg-[#4a3620] text-white font-bold hover:bg-[#d0923f]">
              🔍
            </button>
          </div>
        </div>
      </div>

      {/* Mushroom Grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {filteredMushrooms.length > 0 ? (
          filteredMushrooms.map((m, idx) => (
            <MushroomCard
              key={idx}
              img={m.img}
              name={m.name}
              species={m.species}
              description={m.description}
              href={`/product/${m.name.toLowerCase()}`}
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            No mushrooms found.
          </p>
        )}
      </div>
    </>
  );
}
