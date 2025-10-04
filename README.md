# 🌿 WalkWise: Fitness Walking App with Mood Journal for Intrinsic Growth

**WalkWise** is a holistic fitness and wellness app that blends **walking activity tracking** with a **mood journaling system** — helping users grow intrinsically through mindfulness and consistent effort.

This project focuses not on external validation or badges, but on building **discipline**, **self-awareness**, and **inner motivation** through walking.

---

## ✨ Core Concept

WalkWise is designed to create a connection between **physical activity** and **emotional growth**.  
By combining sensor-based walking data with mood reflections, users can visualize their **inner progress** alongside their **physical journey**.

---

## 🧠 Key Features

### 🏃‍♀️ Walking Tracker
- Tracks **steps**, **distance**, **duration**, and **pace**
- Uses **Expo Pedometer API** for motion sensor data
- Works **offline** and doesn’t require maps

### 💬 Mood Journal
- Allows users to record **daily moods** and reflections
- Provides **guided prompts** for self-awareness
- Stores mood history securely in **Supabase**

### 🌱 Intrinsic Growth System
- AI-guided encouragement based on emotional patterns
- Focus on **intrinsic motivation** instead of badges or ranks
- Encourages reflection over competition

### 📊 Insights Dashboard
- Visualizes the relationship between walking activity and mood
- Displays streaks, consistency levels, and emotional growth trends

### 🔐 Authentication
- Secure **user registration and login** via **Supabase Auth**
- Persistent sessions for personalized data tracking

### ☁️ Cloud Sync & Data Management
- Syncs all walking and journaling data through **Supabase Database**
- **Node.js + Express** backend API handles data flow, logic, and validation
- RESTful endpoints for managing user entries, steps, and moods

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend (Mobile)** | React Native (Expo SDK 53) |
| **UI Styling** | NativeWind (Tailwind CSS for React Native) |
| **Sensors** | Expo Sensors - Pedometer |
| **State Management** | React Context / Zustand |
| **Backend Server** | Node.js + Express |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **API Communication** | REST API (Axios / Fetch) |
| **Storage** | Supabase Storage / AsyncStorage (offline cache) |

---

## ⚙️ System Workflow (IPO Model)

**Input**
- Step count  
- Sensor data  
- User mood entries  
- Reflection notes  
- User account information  

**Process**
- Sentiment classification (based on mood journal)  
- Habit and consistency modeling  
- Personalized feedback generation  
- Sync and update through Supabase backend  

**Output**
- Sustained walking habits  
- Improved mindfulness and mental wellness  
- Enhanced intrinsic motivation  
- Visual insights into growth  

---

## 🧭 How It Works

1. The app activates the **Pedometer** to track walking data.  
2. After each session, users log their **mood** and short reflections.  
3. Data is sent to the **Node.js backend**, which communicates securely with **Supabase**.  
4. The backend handles:
   - Authentication tokens
   - Mood and step data insertion
   - Progress analytics and aggregation  
5. The app displays **interactive insights** correlating steps and mood growth.

---

This is for academic purposes only.
