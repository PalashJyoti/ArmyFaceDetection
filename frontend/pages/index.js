import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Navbar = () => {
  const [activeTab, setActiveTab] = useState('Home');

  const tabs = [
    { name: 'Home', href: '#HeroSection' },
    { name: 'How it Works', href: '#HowItWorksSection' },
    { name: 'Features', href: '#KeyFeaturesSection' },
  ];

  return (
    <nav className="bg-white shadow fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 w-full flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-700">MindSight AI</div>
        <ul className="flex space-x-6 items-center">
          {tabs.map((tab) => (
            <li key={tab.name}>
              <a
                href={tab.href}
                onClick={() => setActiveTab(tab.name)}
                className={`text-sm font-medium ${
                  activeTab === tab.name
                    ? 'text-indigo-700 border-b-2 border-indigo-700 pb-1'
                    : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                {tab.name}
              </a>
            </li>
          ))}
          <li>
            <button
              onClick={() => window.location.href = '/login'}
              className="ml-4 px-4 py-1.5 text-sm font-medium text-white bg-indigo-700 rounded hover:bg-indigo-800"
            >
              Login
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

function Index() {
  const [message, setMessage] = useState("Loading");

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section id='HeroSection' className='h-[calc(100vh-64px)] bg-indigo-100 w-full px-6 sm:px-[100px] flex items-center mt-16'>
        <div className='grid sm:grid-cols-12 gap-10 items-center w-full'>
          <div className='sm:col-span-6 space-y-6'>
            <h1 className='leading-snug text-4xl md:text-5xl font-bold text-indigo-900'>Unlock Emotions Through Facial Expressions</h1>
            <p className='text-lg md:text-xl text-gray-700 leading-relaxed max-w-xl'>Gain deep insights into human feelings by analyzing subtle cues in real-time.</p>
            <div className="flex gap-4">
              <button type="button" className="tracking-wide text-white bg-indigo-700 hover:bg-indigo-800 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm md:text-base px-6 py-2.5">Request a Demo</button>
              <button type="button" className="tracking-wide text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 focus:ring-4 focus:ring-indigo-100 font-medium rounded-lg text-sm md:text-base px-6 py-2.5">Learn More</button>
            </div>
          </div>
          <div className='sm:col-span-6'>
            <img src="/face_recognition_png.png" alt="Face Recognition Illustration" className='w-full max-w-md mx-auto'/>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id='HowItWorksSection' className='w-full px-6 sm:px-[100px] bg-cyan-50 py-16'>
        <h2 className='text-3xl font-semibold text-center text-cyan-800 mb-12'>How It Works</h2>
        <div className='grid sm:grid-cols-4 gap-8 text-center'>
          {[
            { icon: "/upload_icon_png.png", title: "Upload/Stream", desc: "Effortlessly upload images or stream video." },
            { icon: "/face_icon_png.png", title: "Analyze Faces", desc: "Advanced AI algorithms identify key facial features." },
            { icon: "/emotion_icon_png.png", title: "Detect Emotions", desc: "Receive accurate and nuanced emotion classifications." },
            { icon: "/insight_icon_png.png", title: "Gain Insights", desc: "Understand emotional trends and patterns in data." },
          ].map((item, index) => (
            <div key={index} className='space-y-4'>
              <img src={item.icon} alt={item.title} className='mx-auto h-16'/>
              <h3 className='text-xl font-semibold text-cyan-700'>{item.title}</h3>
              <p className='text-gray-600'>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Section */}
      <section id='KeyFeaturesSection' className='w-full px-6 sm:px-[100px] bg-rose-50 py-16'>
        <div className='grid sm:grid-cols-2 gap-12 items-center'>
          <div>
            <h2 className='text-3xl font-semibold text-rose-800 mb-6'>Key Features</h2>
            <ul className='list-disc list-inside text-rose-700 space-y-2'>
              <li>Real-time Analysis</li>
              <li>Image & Video Support</li>
              <li>High Accuracy</li>
              <li>Multiple Emotion Detection</li>
              <li>Data Visualization</li>
            </ul>
          </div>
          <div className='p-8 bg-white border border-rose-300 rounded-xl text-center space-y-4'>
            <h3 className='text-2xl font-semibold text-rose-900'>See the Unseen.</h3>
            <h3 className='text-2xl font-semibold text-rose-900'>Understand the Felt.</h3>
            <button className='mt-4 bg-rose-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-rose-700'>Explore the Possibilities</button>
          </div>
        </div>
      </section>

      {/* Discover Emotions Section */}
      <section id='DiscoverSection' className='w-full px-6 sm:px-[100px] py-16 bg-white'>
        <h2 className='text-3xl font-semibold text-center mb-12'>Discover the Spectrum of Emotions</h2>
        <div className='grid sm:grid-cols-4 gap-6 text-center'>
          {[
            { emotion: "Joy", bg: "bg-yellow-100", text: "text-yellow-800", icon: "/joy_icon.png" },
            { emotion: "Surprise", bg: "bg-sky-100", text: "text-sky-800", icon: "/surprised_icon.png" },
            { emotion: "Sadness", bg: "bg-blue-100", text: "text-blue-800", icon: "/sadness_icon.png" },
            { emotion: "Anger", bg: "bg-red-100", text: "text-red-800", icon: "/anger_icon.png" },
            { emotion: "Contempt", bg: "bg-purple-100", text: "text-purple-800", icon: "/contempt_icon.png" },
            { emotion: "Fear", bg: "bg-indigo-100", text: "text-indigo-800", icon: "/fear_icon.png" },
            { emotion: "Disgust", bg: "bg-green-100", text: "text-green-800", icon: "/disgust_icon.png" },
            { emotion: "Neutral", bg: "bg-gray-100", text: "text-gray-800", icon: "/neutral_icon.png" },
          ].map((item, index) => (
            <div key={index} className={`${item.bg} ${item.text} p-6 rounded-lg shadow-sm flex flex-col items-center`}>
              <img src={item.icon} alt={item.emotion} className="h-16 mb-4" />
              <div className="font-semibold text-xl">{item.emotion}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default Index;