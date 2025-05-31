import React, { useEffect, useState } from 'react';
import axios from '@/pages/api/axios';
import { useRouter } from "next/router";

const Navbar = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { name: 'Home', href: '#HeroSection' },
    { name: 'How it Works', href: '#HowItWorksSection' },
    { name: 'Features', href: '#KeyFeaturesSection' },
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-neutral-900/95 to-neutral-800/95 shadow-lg backdrop-blur-md">
      <div className="h-16 px-6 max-w-screen-xl mx-auto flex justify-between items-center">
        <div
          className="text-2xl font-bold tracking-wide text-blue-200 whitespace-nowrap hover:text-white transition-colors cursor-pointer"
          onClick={() => scrollToSection('#HeroSection')}
        >
          MindSight AI
        </div>

        {/* Hamburger Button (Mobile) */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
          >
            <svg className="h-6 w-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex space-x-8 items-center">
          {tabs.map((tab) => (
            <li key={tab.name}>
              <button
                onClick={() => {
                  setActiveTab(tab.name);
                  scrollToSection(tab.href);
                }}
                className={`text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  activeTab === tab.name
                    ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-1'
                    : 'text-blue-200 hover:text-teal-400'
                }`}
              >
                {tab.name}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => (window.location.href = '/login')}
              className="ml-4 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-md"
            >
              Login
            </button>
          </li>
        </ul>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-gradient-to-r from-neutral-900/98 to-neutral-800/98 backdrop-blur-md px-6 pb-4 space-y-2 shadow-2xl border-t border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => {
                setActiveTab(tab.name);
                scrollToSection(tab.href);
                setIsOpen(false);
              }}
              className={`block w-full text-left text-sm font-medium py-3 px-3 rounded-lg transition-all ${
                activeTab === tab.name
                  ? 'text-teal-400 font-semibold bg-teal-400/10'
                  : 'text-blue-200 hover:text-teal-400 hover:bg-teal-400/5'
              }`}
            >
              {tab.name}
            </button>
          ))}
          <button
            onClick={() => {
              setIsOpen(false);
              window.location.href = '/login';
            }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 mt-3 shadow-md"
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
};


function Index() {
  const [message, setMessage] = useState('Loading');
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleOptionClick = async (option) => {
    setShowModal(false);

    if (option === "webcam") {
      console.log("Webcam selected");

      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        alert("Your browser does not support webcam access.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasWebcam = devices.some(
          (device) => device.kind === "videoinput"
        );

        if (!hasWebcam) {
          alert("No webcam found on this device.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        setTimeout(async () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL("image/jpeg");

          const response = await axios.post("/api/emotion-detect", {
            image: base64Image,
          });

          stream.getTracks().forEach((track) => track.stop());

          router.push({
            pathname: "/emotion",
            query: {
              label: response.data.label,
              confidence: response.data.confidence,
            },
          });
        }, 1000);
      } catch (err) {
        console.error("Webcam access denied or failed:", err);

        if (err.name === "NotAllowedError") {
          alert("Permission denied. Please allow webcam access.");
        } else if (err.name === "NotFoundError") {
          alert("No webcam device found.");
        } else {
          alert("An error occurred while accessing the webcam.");
        }
      }
    }

    if (option === "upload") {
      router.push("/videoemotion");
    }
  };

  return (
    <>
      <Navbar />

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 scale-100">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              Choose Your Method
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => handleOptionClick("webcam")}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                🎥 Use Webcam
              </button>
              <button
                onClick={() => handleOptionClick("upload")}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                📁 Upload a Video
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-4 text-gray-600 hover:text-gray-800 py-2 transition-colors duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Hero Section */}
      <section
        id="HeroSection"
        className="min-h-screen bg-cover bg-center bg-no-repeat relative overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%), url('/image-7.png')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50"></div>
        <div className="relative z-10 min-h-screen flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            <div className="space-y-8 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Unlock Emotions
                </span>
                <br />
                <span className="text-white drop-shadow-lg">Through Facial</span>
                <br />
                <span className="text-white drop-shadow-lg">Expressions</span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 leading-relaxed max-w-2xl mx-auto lg:mx-0 drop-shadow-md">
                Gain deep insights into human feelings by analyzing subtle cues in real-time with our advanced AI technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <button
                  onClick={() => setShowModal(true)}
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl border border-white/20"
                >
                  <span className="flex items-center justify-center gap-2">
                    🚀 Request a Demo
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                  </span>
                </button>
                <button className="bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 hover:border-white/50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced How It Works Section */}
      <section id="HowItWorksSection" className="py-20 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-cyan-800 mb-6">How It Works</h2>
            <p className="text-xl text-cyan-600 max-w-3xl mx-auto">
              Our advanced AI technology processes facial expressions through a simple four-step process
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '/upload_icon_png.png',
                title: 'Upload/Stream',
                desc: 'Effortlessly upload images or stream video in real-time.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: '/face_icon_png.png',
                title: 'Analyze Faces',
                desc: 'Advanced AI algorithms identify key facial features and landmarks.',
                color: 'from-emerald-500 to-teal-500'
              },
              {
                icon: '/emotion_icon_png.png',
                title: 'Detect Emotions',
                desc: 'Receive accurate and nuanced emotion classifications instantly.',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: '/insight_icon_png.png',
                title: 'Gain Insights',
                desc: 'Understand emotional trends and patterns in comprehensive data.',
                color: 'from-orange-500 to-red-500'
              },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-r ${item.color} p-3 shadow-lg`}>
                    <img src={item.icon} alt={item.title} className="w-full h-full object-contain filter brightness-0 invert" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">{item.title}</h3>
                  <p className="text-gray-600 text-center leading-relaxed">{item.desc}</p>
                </div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Key Features Section */}
      <section id="KeyFeaturesSection" className="py-20 bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-rose-800 mb-6">Key Features</h2>
                <p className="text-xl text-rose-600 mb-8">
                  Discover the powerful capabilities that make our emotion detection technology industry-leading
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: '⚡', title: 'Real-time Analysis', desc: 'Instant emotion detection with millisecond response times' },
                  { icon: '🎯', title: 'High Accuracy', desc: '99.2% accuracy rate powered by advanced neural networks' },
                  { icon: '📹', title: 'Image & Video Support', desc: 'Process both static images and live video streams' },
                  { icon: '🎭', title: 'Multiple Emotions', desc: 'Detect 8 different emotions with confidence scores' },
                  { icon: '📊', title: 'Data Visualization', desc: 'Beautiful charts and insights dashboard' },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-white/50 rounded-xl hover:bg-white/80 transition-all duration-300">
                    <div className="text-2xl">{feature.icon}</div>
                    <div>
                      <h4 className="font-semibold text-rose-800 mb-1">{feature.title}</h4>
                      <p className="text-rose-600 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="bg-gradient-to-br from-rose-500 to-pink-500 p-12 rounded-3xl shadow-2xl text-center max-w-md transform hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl"></div>
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-3xl font-bold text-white leading-tight">
                      See the Unseen.
                      <br />
                      Understand the Felt.
                    </h3>
                    <p className="text-rose-100">
                      Unlock the power of emotional intelligence with cutting-edge AI technology
                    </p>
                    <button className="bg-white text-rose-600 px-8 py-3 rounded-xl font-semibold hover:bg-rose-50 transition-all duration-300 transform hover:scale-105 shadow-lg">
                      Explore Possibilities
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Emotions Spectrum Section */}
      <section id="DiscoverSection" className="py-20 bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6">Discover the Spectrum of Emotions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI can accurately identify and classify these eight fundamental human emotions
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-6">
            {[
              { emotion: 'Joy', bg: 'from-yellow-400 to-orange-400', icon: '/joy_icon.png' },
              { emotion: 'Surprise', bg: 'from-sky-400 to-blue-400', icon: '/surprised_icon.png' },
              { emotion: 'Sadness', bg: 'from-blue-400 to-indigo-400', icon: '/sadness_icon.png' },
              { emotion: 'Anger', bg: 'from-red-400 to-pink-400', icon: '/anger_icon.png' },
              { emotion: 'Contempt', bg: 'from-purple-400 to-violet-400', icon: '/contempt_icon.png' },
              { emotion: 'Fear', bg: 'from-indigo-400 to-purple-400', icon: '/fear_icon.png' },
              { emotion: 'Disgust', bg: 'from-green-400 to-emerald-400', icon: '/disgust_icon.png' },
              { emotion: 'Neutral', bg: 'from-gray-400 to-slate-400', icon: '/neutral_icon.png' },
            ].map((item, index) => (
              <div
                key={index}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                <div className="relative z-10 p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${item.bg} p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <img src={item.icon} alt={item.emotion} className="w-full h-full object-contain filter brightness-0 invert" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
                    {item.emotion}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default Index;