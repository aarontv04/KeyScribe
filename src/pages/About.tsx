import React from 'react';
import { Music, Wand2, FileAudio, FileText, BookOpen } from 'lucide-react';

export function About() {
  const features = [
    {
      icon: <FileAudio className="w-8 h-8" />,
      title: "Audio Upload",
      description: "Support for various audio formats including MP3 and WAV files."
    },
    {
      icon: <Wand2 className="w-8 h-8" />,
      title: "AI Processing",
      description: "Advanced AI algorithms to accurately transcribe piano notes."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Sheet Music Generation",
      description: "Instantly generate professional-grade sheet music from your recordings."
    },
    {
      icon: <Music className="w-8 h-8" />,
      title: "Musical Accuracy",
      description: "High-precision note detection and rhythm analysis."
    }
  ];

  const papers = [
    {
      title: "High-Resolution Piano Transcription with Pedals by Regressing Onset and Offset Times",
      authors: "Jong Wook Kim, Juan Pablo Bello",
      conference: "IEEE/ACM Transactions on Audio, Speech, and Language Processing, 2019",
      link: "https://arxiv.org/abs/1910.10972"
    },
    {
      title: "Piano Transcription in the Wild: Detecting Piano Notes from Raw Audio",
      authors: "Curtis Hawthorne, Erich Elsen, Jialin Song, Adam Roberts, Ian Simon, Colin Raffel",
      conference: "ISMIR 2019",
      link: "https://arxiv.org/abs/1810.12247"
    },
    {
      title: "Onsets and Frames: Dual-Objective Piano Transcription",
      authors: "Curtis Hawthorne, Andriy Stasyuk, Adam Roberts, Ian Simon, Cheng-Zhi Anna Huang",
      conference: "ISMIR 2018",
      link: "https://arxiv.org/abs/1710.11153"
    }
  ];

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            About KeyScribe
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our cutting-edge AI technology transforms your piano recordings into accurate sheet music,
            making music transcription effortless and accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg hover:bg-white/10 transition-colors"
            >
              <div className="text-blue-400 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Upload Your Recording</h3>
                <p className="text-gray-400">
                  Simply drag and drop your piano recording in MP3 or WAV format into our uploader.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI Processing</h3>
                <p className="text-gray-400">
                  Our advanced AI algorithms analyze your recording, detecting notes, rhythm, and musical elements.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Generate Sheet Music</h3>
                <p className="text-gray-400">
                  Receive your professionally formatted sheet music, ready to be played or shared.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <BookOpen className="w-8 h-8 text-blue-400" />
            <h2 className="text-3xl font-bold">Research Papers</h2>
          </div>
          <div className="space-y-8">
            {papers.map((paper, index) => (
              <div key={index} className="border border-white/10 rounded-lg p-6 hover:bg-white/5 transition-colors">
                <a href={paper.link} target="_blank" rel="noopener noreferrer" className="block">
                  <h3 className="text-xl font-semibold mb-2 text-blue-400 hover:text-blue-300 transition-colors">
                    {paper.title}
                  </h3>
                  <p className="text-gray-300 mb-2">{paper.authors}</p>
                  <p className="text-gray-400 text-sm">{paper.conference}</p>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}