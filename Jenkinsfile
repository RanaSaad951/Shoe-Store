pipeline {
    agent any

    environment {
        // App ka port aur URL
        APP_URL = 'http://localhost:5000'
    }

    stages {
        stage('Checkout') {
            steps {
                // GitHub se code layega[cite: 1]
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker Image for Shoe Store...'
                // Nayi Dockerfile se image banayega[cite: 1]
                sh 'docker build -t shoe-store-app .'
            }
        }

        stage('Run Container & Test') {
            steps {
                echo 'Running Container and Executing Selenium Tests...'
                // Container start karega aur uske andar tests chalayega[cite: 1]
                sh '''
                docker run -d --name shoe-store-container -p 5000:5000 shoe-store-app
                sleep 10
                docker exec shoe-store-container npx mocha test.js
                '''
            }
        }
    }

    post {
        always {
            echo 'Cleaning up container...'
            sh 'docker stop shoe-store-container || true'
            sh 'docker rm shoe-store-container || true'
        }
        success {
            echo 'Tests Passed! Sending Email...'
            // Sir Qasim ko email bhejega[cite: 1]
            mail to: 'qasimalik@gmail.com',
                 subject: 'Jenkins Pipeline Success: Shoe Store Tests',
                 body: 'Hello Sir,\n\nThe automated Selenium test cases for the Shoe Store application have been executed successfully via Jenkins pipeline.\n\nRegards.'
        }
        failure {
            echo 'Tests Failed! Sending Email...'
            mail to: 'qasimalik@gmail.com',
                 subject: 'Jenkins Pipeline Failed: Shoe Store Tests',
                 body: 'Hello Sir,\n\nThe Jenkins pipeline failed during the test stage.\n\nRegards.'
        }
    }
}