// import "../assets/styles/globals.css";
// import Image from "next/image";
// import MushroomCard from "@/components/shared/mushroom/mushroom-card";
// import { Button } from "@/components/ui/button";

// const Mushrooms = [

// ]
// const Homepage = () => {
//   return (
//     <>
//       <div className="h-[500px] relative">
//         <Image
//           src="/images/landing-page-image.jpg"
//           alt="image mushroom"
//           fill
//           className="object-cover"
//           sizes="100vw"
//           priority
//         />

//         {/* Overlay text */}
//         <div className="absolute inset-0 flex flex-col items-start justify-center text-white wrapper">
//           <h1 className="font-bold text-5xl drop-shadow-lg">Mycelium</h1>
//           <p className="text-2xl mt-4 drop-shadow-lg">
//             A look into the mushroom mind
//           </p>
//         </div>
//       </div>
//       <div className="p-5">
//         <div className=" grid grid-cols-3 gap-4 justify-items-center">
//           <MushroomCard />
//           <MushroomCard />
//           <MushroomCard />
//           <MushroomCard />
//           <MushroomCard />
//         </div>
//       </div>
//     </>
//   );
// };

"use client"; // For build error handling

import { useState } from "react";
import "../assets/styles/globals.css";
import Image from "next/image";
import MushroomCard from "@/components/shared/mushroom/mushroom-card";

export default function Homepage() {
  const [search, setSearch] = useState("");

  const mushrooms = [
    {
      img: "/images/oyster-mushroom.jpg",
      name: "Oyster",
      species: "Pleurotus ostreatus",
      description: "Oyster mushroom grows in rainforests etc.",
    },
    {
      img: "/images/shiitake.jpg",
      name: "Shiitake",
      species: "Lentinula edodes",
      description: "Popular in Asian cuisine.",
    },
    {
      img: "/images/velvet-shank.jpg",
      name: "Velvet Shank",
      species: "Flammulina velutipes",
      description: "Found on trees in winter.",
    },
    {
      img: "/images/puffball.jpg",
      name: "Puffball",
      species: "Lycoperdon perlatum",
      description: "Round white fungi.",
    },
    {
      img: "/images/fly-agaric.jpg",
      name: "Fly Agaric",
      species: "Amanita muscaria",
      description: "Iconic red mushroom with white spots.",
    },
    {
      img: "/images/porcini.jpg",
      name: "Porcini",
      species: "Boletus edulis",
      description: "Edible and highly prized.",
    },
  ];

  const filteredMushrooms = mushrooms.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.species.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Homepage Section */}
      <div className="h-[500px] relative">
        <Image
          src="/images/background-mushroom.jpg"
          alt="Mushroom landing"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-start justify-center text-white p-8">
          <h1 className="font-bold text-5xl drop-shadow-lg">Mycelium</h1>
          <p className="text-2xl mt-4 drop-shadow-lg">
            A look into the mushroom mind
          </p>

          {/* Search Box */}
          <div className="mt-6 inline-flex bg-white rounded-full overflow-hidden">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mushrooms..."
              className="px-4 py-2 outline-none"
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
