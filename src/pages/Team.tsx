import React from 'react';

export function Team() {
  const team = [
    {
      name: "Ajmal Mohammed",
      role: "Lead Developer",
      image: "/ajmal.jpg",
      bio: "Expert in full-stack development and audio processing algorithms."
    },
    {
      name: "Aaron Tom",
      role: "Project Manager",
      image: "/aaron.jpg",
      bio: "Experienced project manager specializing in music technology solutions."
    },
    {
      name: "Noel Johnson",
      role: "Scrum Master",
      image: "/noel.jpg",
      bio: "Agile expert ensuring smooth development processes."
    },
    {
      name: "Adithyan S Anil",
      role: "UI/UX Developer",
      image: "/adithyan.jpg",
      bio: "Creates beautiful and intuitive user experiences for music applications."
    }
  ];

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Meet Our Team
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            We're a dedicated team of experts passionate about transforming the way musicians transcribe their work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <div
              key={index}
              className="bg-white/80 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/90 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/10"
            >
              <div className="aspect-square mb-6 overflow-hidden rounded-xl">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
              <p className="text-blue-600 dark:text-blue-400 mb-3">{member.role}</p>
              <p className="text-gray-600 dark:text-gray-400">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}