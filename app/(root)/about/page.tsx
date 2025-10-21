import React from "react";
import { Brain, Heart, Shield } from "lucide-react";
import { Kavoon } from "next/font/google";
const kavoon = Kavoon({ subsets: ["latin"], weight: "400" });

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-[200vh] bg-white">
      {/* Hero Section */}
      <section className="relative min-h-96">
        <div className="absolute inset-0"></div>
        <div
          className="absolute top-0 left-0 w-full h-[85vh] bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/about-background.jpg')",
          }}
        ></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center text-white">
            <h1
              className={`font-bold text-4xl md:text-4xl ${kavoon.className} drop-shadow-[2px_2px_4px_rgba(0,0,0,0.6)]`}
            >
              Myco Lab&apos;s mission to save mushrooms
            </h1>
            <br />
            <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              Myco Lab&apos;s mission is to protect and celebrate mushrooms by
              shining a light on the vibrant mycelium networks that sustain
              them. We raise awareness of this hidden life while supporting
              mushroom growers and enthusiasts on their journeys with knowledge,
              community, and care.
            </p>
          </div>
        </div>
      </section>

      {/* Fungi Under Threat Section */}
      <section className="relative py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#AAA432] rounded-3xl p-10 shadow-xl -mt-20 text-center">
            <h2 className="text-3xl font-bold text-white mb-8">
              Fungi under threat
            </h2>
            <div className="text-white space-y-4 leading-relaxed">
              <p>
                Of the estimated 2.5 million fungal species on Earth, only about
                150,000 have been formally documented, and 1,900 of these have
                been assessed for extinction risk analysis. Among those
                assessed, around 41% species—nearly one-third—are threatened,
                with 279 species imperiled by habitat loss among including
                agricultural expansion and unsustainable land use as significant
                contributors to habitat fragmentation, species degradation.
              </p>
              <p>
                Industrial agriculture is a leading driver of biodiversity
                loss—over 90% of agricultural land globally is now moderately or
                severely degraded, and agricultural expansion accounts for
                approximately 70% of projected terrestrial biodiversity loss.
                These practices harm fungi through habitat clearance, soil
                degradation, pesticide, and nitrogen runoff, and the deposition
                of old-growth forests essential to many fungal species.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            The three pillars of our strategy
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Awareness Pillar */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Brain className="w-8 h-8 text-gray-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Awareness
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Share knowledge about the hidden role of mycelial networks in
                ecosystems. Help mushroom communities, fungi science accessible
                to communities, schools, and the public.
              </p>
            </div>

            {/* Support Pillar */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Heart className="w-8 h-8 text-gray-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Provide resources, training, and community networks to help
                mushroom growers and hobbyists to succeed sustainably.
              </p>
            </div>

            {/* Conservation Pillar */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Shield className="w-8 h-8 text-gray-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Conservation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Promote regenerative agriculture and research to improve soil
                health, fungi into soil health, biodiversity protection, and
                climate resilience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
