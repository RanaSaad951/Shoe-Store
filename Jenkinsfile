pipeline {
    agent any
    
    environment {
        // Yeh line automatically us banday ka email nikalegi jisne GitHub par push kiya hai
        PUSHER_EMAIL = sh(script: "git --no-pager show -s --format='%ae'", returnStdout: true).trim()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker Image for Shoe Store...'
                sh 'docker build -t shoe-store-app .'
            }
        }
        
        stage('Run Container & Test') {
            steps {
                echo 'Running Container and Executing Selenium Tests...'
                // Puraane container ko clear karna (agar koi pehle se chal raha ho)
                sh 'docker stop shoe-store-container || true'
                sh 'docker rm shoe-store-container || true'
                
                // Naya container detached mode (-d) mein chalana
                sh 'docker run -d --name shoe-store-container -p 5000:5000 shoe-store-app'
                
                // Container ko thora time dena start hone ke liye
                sh 'sleep 10'
                
                // Tests run karna
                sh 'docker exec shoe-store-container npx mocha test.js'
            }
        }
    }
    
    post {
        success {
            echo "Tests Passed! Container is UP on port 5000. Sending Email..."
            // Yahan hum container ko stop/rm nahi kar rahe taake deployment "UP" rahe
            mail to: "${PUSHER_EMAIL}",
                 subject: "SUCCESS: Shoe Store Pipeline Passed",
                 body: "Good news! Your push was successful. The 15 Selenium test cases passed, and the container deployment is now UP on the server."
        }
        failure {
            echo "Tests Failed! Cleaning up container and Sending Email..."
            // Agar test fail ho jaye toh ghalat code wala container delete kar do
            sh 'docker stop shoe-store-container || true'
            sh 'docker rm shoe-store-container || true'
            
            mail to: "${PUSHER_EMAIL}",
                 subject: "FAILED: Shoe Store Pipeline Failed",
                 body: "Oops! The pipeline failed. The container was stopped. Please check the Jenkins console output to see which test case failed."
        }
    }
}
