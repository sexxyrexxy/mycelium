"use client"; // For build error handling

import { useState } from "react";
import "../../assets/styles/globals.css";
import Image from "next/image";
import MushroomCard from "@/components/shared/mushroom/mushroom-card";
import { Kavoon } from "next/font/google";

const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

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
    {
      name: "Wine Cap",
      species: "Stropharia rugosoannulata",
      description:
        "Large burgundy-capped mushrooms known as the Garden Giant, thriving in outdoor wood chip or straw beds.",
    },
    {
      name: "Enoki",
      species: "Flammulina velutipes",
      description:
        "Also called Enoki, these long, slender white mushrooms grow in cool conditions and are popular in soups and stir-fries.",
    },
    {
      name: "King Oyster",
      species: "Pleurotus eryngii",
      description:
        "King Oyster mushrooms with thick stems and savory umami flavor, prized for grilling and gourmet cooking.",
    },
    {
      name: "Lion Mane",
      species: "Hericium erinaceus",
      description:
        "Lion’s Mane mushrooms with cascading spines, valued for seafood-like texture and medicinal properties.",
    },
    {
      name: "Rose Cluster",
      species: "Pleurotus djamor",
      description:
        "Vibrant pink oyster mushrooms that grow in dense clusters, fast to cultivate but with a short shelf life.",
    },
    {
      name: "Turkey Tail",
      species: "Trametes versicolor",
      description:
        "Colorful, fan-shaped Turkey Tail mushrooms, prized for their immune-boosting medicinal compounds rather than culinary use.",
    },
  ].map((m) => ({
    ...m,
    img: `/images/${m.name.toLowerCase().replace(/\s+/g, "")}.jpg`,
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
          <h1
            className={`font-bold text-4xl md:text-4xl ${kavoon.className} drop-shadow-[2px_2px_4px_rgba(0,0,0,0.6)]`}
          >
            Find a Mushroom
          </h1>

          {/* Search Box */}
          <div className="mt-6 flex bg-white rounded-full overflow-hidden opacity-70 w-full max-w-xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mushrooms..."
              className="flex-grow px-4 py-2 outline-none text-black"
            />
            <button className="px-4 bg-white flex items-center justify-center">
              <Image
                src="/images/search.png"
                alt="Search"
                width={44}
                height={44}
                className="w-11 h-11"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mushroom Grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
        {filteredMushrooms.length > 0 ? (
          filteredMushrooms.map((m, idx) => (
            <MushroomCard
              key={idx}
              img={m.img}
              name={m.name}
              species={m.species}
              description={m.description}
              href={`/grow/${m.name.toLowerCase().replace(/\s+/g, "")}`}
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
