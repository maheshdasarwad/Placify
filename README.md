# Placify

A full-stack web application that combines AI-powered intelligence with document processing capabilities for intelligent content management and analysis.

## 🚀 Features

- **AI-Powered Document Analysis**: Leverages Google GenAI for intelligent content processing
- **PDF Processing**: Extract and analyze data from PDF documents
- **Web Scraping**: Capture and process web content with Puppeteer
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Modern Frontend**: React-based UI with responsive design using SASS
- **RESTful Backend**: Express.js API with MongoDB database
- **File Upload**: Handle file uploads with Multer
- **Data Validation**: Type-safe schema validation with Zod

## 📋 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.2.1
- **Database**: MongoDB with Mongoose 9.6.1
- **Authentication**: JWT & bcryptjs
- **AI Integration**: Google GenAI 2.0.1
- **File Processing**: 
  - PDF parsing with pdf-parse
  - Web scraping with Puppeteer
  - File uploads with Multer
- **Data Validation**: Zod with JSON Schema conversion
- **Development**: Nodemon for auto-reload

### Frontend
- **Framework**: React 19.2.5
- **Routing**: React Router 7.15.0
- **Build Tool**: Vite 8.0.10
- **HTTP Client**: Axios 1.16.0
- **Styling**: SASS/SCSS
- **Linting**: ESLint

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB instance
- Google GenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   npm run dev
