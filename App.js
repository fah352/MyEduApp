import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
  Linking,
  Switch,
} from 'react-native';

// React Native Firebase imports
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
// import '@react-native-firebase/storage'; // Uncomment if you implement full Firebase Storage uploads
import { WebView } from 'react-native-webview';

// Get screen dimensions for responsive styling
const { width, height } = Dimensions.get('window');

// Hardcoded Firebase Configuration (MATCHES your google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyBmQkY69cW1aDBcK3ZrZ7XNVO4yVkel-Fw",
  authDomain: "edupro-aaad1.firebaseapp.com",
  projectId: "edupro-aaad1",
  storageBucket: "edupro-aaad1.firebasestorage.app",
  messagingSenderId: "1034530041345",
  appId: "1:1034530041345:web:d5c77919c72fe8017d5a00",
  measurementId: "G-G96CFLR39B"
};

// Initialize Firebase if not already (important for hot reloading in development)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Main App component for the authentication page
const App = () => {
  // --- Firebase Instances ---
  const auth = firebase.auth();
  const db = firebase.firestore();
  // Removed: const functions = firebase.functions(); // No longer needed
  // const storage = firebase.storage(); // Uncomment if you implement full Firebase Storage uploads
  const appId = 'default-app-id'; // This should match your Firestore rules path

  // --- Authentication States ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- View Management State ---
  const [currentView, setCurrentView] = useState('welcome'); // Starts on welcome screen

  // --- Developer Mode States ---
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerPassword, setDeveloperPassword] = useState('');
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // --- Student Profile States ---
  const [profileData, setProfileData] = useState({
    name: '',
    fatherName: '',
    className: '',
    province: '',
    dob: '',
    location: ''
  });
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [selectedStudentForDevView, setSelectedStudentForDevView] = useState(null);
  // Removed: const [dmcImageBase64, setDmcImageBase64] = useState('');
  // Removed: const [dmcVerificationStatus, setDmcVerificationStatus] = useState(null);

  // --- Test Management States ---
  const [tests, setTests] = useState([]);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [pastedTestContent, setPastedTestContent] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [studentSpecificTestResults, setStudentSpecificTestResults] = useState([]);
  const [selectedDetailedResult, setSelectedDetailedResult] = useState(null);
  const [isPremiumTest, setIsPremiumTest] = useState(false);
  const [allowedProvinces, setAllowedProvinces] = useState('');
  const [premiumAccessRequests, setPremiumAccessRequests] = useState([]);

  // --- Question Bank States (New Feature) ---
  const [questions, setQuestions] = useState([]);
  const [newQuestionData, setNewQuestionData] = {
    text: '',
    options: ['', '', '', ''],
    correctAnswerIndex: null,
    reason: '',
    topic: '',
    difficulty: '',
  };
  const [editingQuestion, setEditingQuestion] = useState(null);

  // --- Post Management States ---
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostHtmlContent, setNewPostHtmlContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // --- Forum States (New Feature) ---
  const [forumThreads, setForumThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');

  // --- Resource Library States (New Feature) ---
  const [resources, setResources] = useState([]);
  const [newResourceData, setNewResourceData] = {
    title: '',
    description: '',
    type: 'link',
    url: '',
    topic: '',
  };

  // --- Analytics States (New Feature) ---
  const [analyticsData, setAnalyticsData] = useState({
    totalStudents: 0,
    totalTests: 0,
    totalPosts: 0,
    totalResults: 0,
  });

  // --- Firestore Data Initialization Function ---
  const initializeFirestoreData = async () => {
    try {
      const devCodeRef = db.collection(`artifacts/${appId}/public/data/developerSettings`).doc('secretCode');
      const devCodeSnap = await devCodeRef.get();
      if (!devCodeSnap.exists) {
        await devCodeRef.set({ code: 'MANDURI' });
        console.log('Developer secret code initialized in Firestore.');
      }
    } catch (error) {
      console.error('Error initializing Firestore data:', error);
      setMessage(`Failed to initialize Firestore data: ${error.message}`);
    }
  };

  // --- Helper function to check if a UID is an authorized developer ---
  const checkIfDeveloper = async (uid) => {
    if (!uid) return false;
    const devRef = db.collection(`artifacts/${appId}/public/data/authorizedDevelopers`).doc(uid);
    try {
      const docSnap = await devRef.get();
      return docSnap.exists;
    } catch (error) {
      console.error('Error checking if user is developer:', error);
      return false;
    }
  };

  // --- Firebase Initialization and Auth Listener ---
  useEffect(() => {
    initializeFirestoreData();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (isDeveloperMode) {
        setIsAuthReady(true);
        return;
      }

      if (user) {
        setUserId(user.uid);
        setMessage(`Welcome, ${user.email || 'Guest'}!`);

        const isAuthDeveloper = await checkIfDeveloper(user.uid);

        if (isAuthDeveloper) {
          setIsDeveloperMode(true);
          setCurrentView('developerDashboard');
          setMessage('Developer access granted!');
          fetchStudentProfiles();
          fetchTests();
          fetchAllTestResults();
          fetchPosts();
          fetchQuestions();
          fetchForumThreads();
          fetchResources();
          fetchAnalyticsData();
          fetchPremiumAccessRequests();
        } else {
          setIsDeveloperMode(false);
          const profileRef = db.collection(`artifacts/${appId}/public/data/studentProfiles`).doc(user.uid);
          const profileSnap = await profileRef.get();

          if (!profileSnap.exists) {
              setCurrentView('createProfile');
              setMessage('Please create your profile to view tests.');
          } else {
              setCurrentView('studentDashboard');
              setMessage('Profile loaded. Fetching tests...');
              setProfileData(profileSnap.data());
              fetchTests();
              fetchPosts();
              fetchForumThreads();
              fetchResources();
          }
        }
      } else {
        setUserId(null);
        setIsDeveloperMode(false);
        setMessage('Please log in or sign up.');
        if (currentView !== 'welcome') {
          setCurrentView('auth');
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [isDeveloperMode, currentView]);

  // --- Student Authentication Handlers ---
  const handleLogin = async () => {
    setLoading(true); setMessage('');
    try {
      await auth.signInWithEmailAndPassword(email, password);
      setMessage('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Check credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') { errorMessage = 'Invalid email or password.'; }
      else if (error.code === 'auth/invalid-email') { errorMessage = 'Valid email required.'; }
      Alert.alert("Login Failed", errorMessage);
      setMessage(errorMessage);
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    setLoading(true); setMessage('');
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      setMessage('Account created successfully!');
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Signup failed. Try again.';
      if (error.code === 'auth/email-already-in-use') { errorMessage = 'Email in use. Log in.'; }
      else if (error.code === 'auth/weak-password') { errorMessage = 'Password needs 6+ chars.'; }
      else if (error.code === 'auth/invalid-email') { errorMessage = 'Valid email required.'; }
      Alert.alert("Signup Failed", errorMessage);
      setMessage(errorMessage);
    } finally { setLoading(false); }
  };

  // --- Student Profile Handlers ---
  const handleSaveProfile = async () => {
    if (!auth.currentUser || !db) { setMessage('Authentication required to save profile.'); return; }
    if (!profileData.name || !profileData.fatherName || !profileData.className || !profileData.province || !profileData.dob || !profileData.location) {
        Alert.alert("Missing Info", "Please fill in all profile fields.");
        setMessage('Please fill in all profile fields.'); return;
    }

    setLoading(true); setMessage('');
    try {
        const profileRef = db.collection(`artifacts/${appId}/public/data/studentProfiles`).doc(auth.currentUser.uid);
        await profileRef.set({ ...profileData, email: auth.currentUser.email });
        setMessage('Profile saved successfully!');
        setCurrentView('studentDashboard');
        fetchTests();
    } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert("Save Profile Failed", `Failed to save profile: ${error.message}`);
        setMessage(`Failed to save profile: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Test Management Handlers ---
  const fetchTests = async () => {
    if (!db) { setMessage('Firestore not initialized.'); return; }
    setLoading(true); setMessage('Fetching tests...');
    try {
        const testsCollectionRef = db.collection(`artifacts/${appId}/public/data/tests`);
        const querySnapshot = await testsCollectionRef.get();
        const fetchedTests = [];
        for (const docSnap of querySnapshot.docs) {
            const test = { id: docSnap.id, ...docSnap.data() };
            if (userId && !isDeveloperMode) {
                const testResultRef = db.collection(`artifacts/${appId}/public/data/testResults`).doc(`${userId}_${test.id}`);
                const testResultSnap = await testResultRef.get();
                if (testResultSnap.exists) {
                    test.lastScore = testResultSnap.data().score;
                    test.totalQuestions = testResultSnap.data().totalQuestions;
                }
            }
            fetchedTests.push(test);
        }
        setTests(fetchedTests);
        setMessage(`Found ${fetchedTests.length} tests.`);
    } catch (error) {
        console.error('Error fetching tests:', error);
        setMessage(`Failed to fetch tests: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Premium Test Access Logic (New Feature) ---
  const checkPremiumAccess = async (test) => {
    if (!test.isPremium) return true; // Not a premium test, allow access

    if (!auth.currentUser || !profileData.province) {
      setMessage('Please complete your profile to access premium tests.');
      return false;
    }

    const studentProvince = profileData.province.toLowerCase();
    const allowedProvincesArray = test.allowedProvinces ? test.allowedProvinces.map(p => p.toLowerCase()) : [];

    // Check if student's province is in the allowed list
    const isProvinceAllowed = allowedProvincesArray.includes(studentProvince);

    // Check if student has explicit access granted by developer
    const accessGrantRef = db.collection(`artifacts/${appId}/public/data/premiumAccessGrants`).doc(`${auth.currentUser.uid}_${test.id}`);
    const accessGrantSnap = await accessGrantRef.get();
    const isAccessGranted = accessGrantSnap.exists;

    if (isProvinceAllowed || isAccessGranted) {
      return true; // Allowed by province or explicit grant
    } else {
      // Not allowed, redirect to payment page
      Alert.alert(
        "Premium Test",
        `This is a premium test for students from ${test.allowedProvinces.join(', ')}. Your current province (${profileData.province}) is not allowed.`,
        [
          { text: "OK", onPress: () => {
              setSelectedTest(test); // Keep test selected for payment page
              setCurrentView('paymentRequired');
            }
          }
        ]
      );
      return false;
    }
  };

  const startTest = async (test) => {
    setLoading(true);
    const hasAccess = await checkPremiumAccess(test);
    setLoading(false);

    if (hasAccess) {
      setSelectedTest(test);
      setCurrentQuestionIndex(0);
      setStudentAnswers(new Array(test.questions.length).fill(null));
      setCurrentView('takeTest');
      setMessage('');
    }
  };

  // --- Request Premium Access (New Feature) ---
  const requestPremiumAccess = async () => {
    if (!auth.currentUser || !selectedTest) {
      Alert.alert("Error", "Cannot request access. Login or test missing.");
      return;
    }
    setLoading(true); setMessage('Requesting access...');
    try {
      await db.collection(`artifacts/${appId}/public/data/premiumAccessRequests`).add({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        testId: selectedTest.id,
        testTitle: selectedTest.title,
        status: 'pending',
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMessage('Access request sent to developer. Please wait for verification.');
      Alert.alert("Request Sent", "Your request for premium test access has been sent. The developer will review it.");
      setCurrentView('studentDashboard');
    } catch (error) {
      console.error('Error requesting access:', error);
      Alert.alert("Request Failed", `Failed to send request: ${error.message}`);
      setMessage(`Failed to send request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Developer Premium Access Management (New Feature) ---
  const fetchPremiumAccessRequests = async () => {
    if (!db) return;
    setLoading(true); setMessage('Fetching premium access requests...');
    try {
      const requestsRef = db.collection(`artifacts/${appId}/public/data/premiumAccessRequests`);
      const snapshot = await requestsRef.where('status', '==', 'pending').get();
      const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPremiumAccessRequests(fetchedRequests);
      setMessage(`Found ${fetchedRequests.length} pending requests.`);
    } catch (error) {
      console.error('Error fetching premium access requests:', error);
      Alert.alert("Error", `Failed to fetch requests: ${error.message}`);
    } finally { setLoading(false); }
  };

  const grantPremiumAccess = async (request) => {
    if (!db || !auth.currentUser) return;
    setLoading(true); setMessage('Granting access...');
    try {
      await db.collection(`artifacts/${appId}/public/data/premiumAccessGrants`).doc(`${request.userId}_${request.testId}`).set({
        userId: request.userId,
        testId: request.testId,
        grantedBy: auth.currentUser.uid,
        grantedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection(`artifacts/${appId}/public/data/premiumAccessRequests`).doc(request.id).update({
        status: 'granted',
        grantedAt: firebase.firestore.FieldValue.serverTimestamp(),
        grantedBy: auth.currentUser.uid,
      });
      setMessage('Access granted successfully!');
      fetchPremiumAccessRequests();
      Alert.alert("Access Granted", `Access granted to ${request.userEmail} for ${request.testTitle}.`);
    } catch (error) {
      console.error('Error granting access:', error);
      Alert.alert("Error", `Failed to grant access: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Parsing and Creating Test from Pasted Text ---
  const parseTestContent = (content) => {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const questions = [];
    let currentQuestion = {};
    let statementFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('STATEMENT,')) {
        if (statementFound) {
          if (currentQuestion.text && currentQuestion.options && currentQuestion.options.length === 4 && currentQuestion.correctAnswerIndex !== undefined && currentQuestion.reason) {
            questions.push(currentQuestion);
          } else {
            throw new Error(`Incomplete question before line ${i + 1}. Ensure all parts (STATEMENT, 4 OPTIONS, CORRECT OPTION, REASON) are present for each question.`);
          }
        }
        currentQuestion = { text: line.substring('STATEMENT,'.length).trim(), options: [], correctAnswerIndex: undefined, reason: '' };
        statementFound = true;
      } else if (statementFound && line.startsWith('OPTION A,')) {
        currentQuestion.options[0] = line.substring('OPTION A,'.length).trim();
      } else if (statementFound && line.startsWith('OPTION B,')) {
        currentQuestion.options[1] = line.substring('OPTION B,'.length).trim();
      } else if (statementFound && line.startsWith('OPTION C,')) {
        currentQuestion.options[2] = line.substring('OPTION C,'.length).trim();
      } else if (statementFound && line.startsWith('OPTION D,')) {
        currentQuestion.options[3] = line.substring('OPTION D,'.length).trim();
      } else if (statementFound && line.startsWith('CORRECT OPTION,(')) {
        const match = line.match(/CORRECT OPTION,\(([A-D])\)/);
        if (match) {
          const correctLetter = match[1];
          currentQuestion.correctAnswerIndex = correctLetter.charCodeAt(0) - 'A'.charCodeAt(0);
        } else {
          throw new Error(`Invalid CORRECT OPTION format on line ${i + 1}. Expected e.g., CORRECT OPTION,(A)`);
        }
      } else if (statementFound && line.startsWith('REASON,(')) {
        const match = line.match(/REASON,\((.*)\)/);
        if (match) {
          currentQuestion.reason = match[1].trim();
        } else {
          throw new Error(`Invalid REASON format on line ${i + 1}. Expected e.g., REASON,(Your reason here.)`);
        }
      } else if (line.length > 0) {
        throw new Error(`Unexpected line format on line ${i + 1}: "${line}". Each line must start with a specific keyword (STATEMENT, OPTION A, etc.) or be empty.`);
      }
    }

    if (statementFound) {
        if (currentQuestion.text && currentQuestion.options.length === 4 && currentQuestion.correctAnswerIndex !== undefined && currentQuestion.reason) {
            questions.push(currentQuestion);
        } else {
            throw new Error('The last question in the pasted content is incomplete. Ensure all parts are present.');
        }
    }

    if (questions.length === 0) {
      throw new Error('No valid questions parsed. Please check the format and ensure at least one complete question is present.');
    }
    return questions;
  };

  const handleCreateTest = async () => {
    if (!db) { setMessage('Firestore not initialized.'); return; }
    if (!newTestTitle) {
      Alert.alert("Missing Title", "Please enter a test title.");
      setMessage('Please enter a test title.');
      return;
    }
    if (!pastedTestContent) {
      Alert.alert("Missing Content", "Please paste the test content.");
      setMessage('Please paste the test content.');
      return;
    }
    if (isPremiumTest && !allowedProvinces.trim()) {
      Alert.alert("Missing Info", "Please specify allowed provinces for premium test.");
      return;
    }

    setLoading(true); setMessage('');
    let parsedQuestions;
    try {
      parsedQuestions = parseTestContent(pastedTestContent);
    } catch (error) {
      Alert.alert("Parsing Error", `Parsing error: ${error.message}`);
      setMessage(`Parsing error: ${error.message}`);
      setLoading(false);
      return;
    }

    try {
      const testsCollectionRef = db.collection(`artifacts/${appId}/public/data/tests`);
      await testsCollectionRef.add({
        title: newTestTitle,
        description: 'Test created from pasted text.',
        questions: parsedQuestions,
        createdBy: isDeveloperMode ? (auth.currentUser ? auth.currentUser.uid : 'DEVELOPER_ACCOUNT') : userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isPremium: isPremiumTest,
        allowedProvinces: isPremiumTest ? allowedProvinces.split(',').map(p => p.trim()) : [],
      });
      setMessage('Test created successfully!');
      setNewTestTitle('');
      setPastedTestContent('');
      setIsPremiumTest(false);
      setAllowedProvinces('');
      setCurrentView('developerTests');
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      Alert.alert("Create Test Failed", `Failed to create test: ${error.message}`);
      setMessage(`Failed to create test: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Test Taking Logic ---
  const handleAnswerSelection = (questionIndex, optionIndex) => {
    const newAnswers = [...studentAnswers];
    if (newAnswers[questionIndex] === optionIndex) {
      newAnswers[questionIndex] = null;
    } else {
      newAnswers[questionIndex] = optionIndex;
    }
    setStudentAnswers(newAnswers);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < selectedTest.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitTest();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = async () => {
    if (!auth.currentUser || !db || !selectedTest) {
      Alert.alert("Error", "Cannot submit test. Authentication or test data missing.");
      setMessage('Cannot submit test. Authentication or test data missing.');
      return;
    }
    setLoading(true);
    setMessage('Submitting test...');

    let score = 0;
    const answeredQuestions = selectedTest.questions.map((q, index) => {
      const selectedOptionIndex = studentAnswers[index];
      const isCorrect = selectedOptionIndex === q.correctAnswerIndex;
      if (isCorrect) {
        score++;
      }
      return { questionIndex: index, selectedOptionIndex, isCorrect };
    });

    try {
      const testResultsCollectionRef = db.collection(`artifacts/${appId}/public/data/testResults`);
      const resultDocRef = testResultsCollectionRef.doc(`${auth.currentUser.uid}_${selectedTest.id}`);

      await resultDocRef.set({
        userId: auth.currentUser.uid,
        testId: selectedTest.id,
        score: score,
        totalQuestions: selectedTest.questions.length,
        answers: answeredQuestions,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      setMessage(`Test submitted! Your score: ${score}/${selectedTest.questions.length}`);
      Alert.alert("Test Submitted!", `Your score: ${score}/${selectedTest.questions.length}`);
      await viewDetailedResult(`${auth.currentUser.uid}_${selectedTest.id}`);
      setSelectedTest(null);
      setCurrentQuestionIndex(0);
      setStudentAnswers([]);
      fetchTests();
    } catch (error) {
      console.error('Error submitting test:', error);
      Alert.alert("Submission Failed", `Failed to submit test: ${error.message}`);
      setMessage(`Failed to submit test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- View Detailed Result (for both student and developer) ---
  const viewDetailedResult = async (resultId) => {
    if (!db) { setMessage('Firestore not initialized.'); return; }
    setLoading(true); setMessage('Loading result details...');
    try {
      const resultRef = db.collection(`artifacts/${appId}/public/data/testResults`).doc(resultId);
      const resultSnap = await resultRef.get();

      if (resultSnap.exists) {
        const resultData = resultSnap.data();
        const testRef = db.collection(`artifacts/${appId}/public/data/tests`).doc(resultData.testId);
        const testSnap = await testRef.get();

        if (testSnap.exists) {
          const testData = testSnap.data();
          const detailedQuestions = testData.questions.map((q, index) => ({
            ...q,
            selectedOptionIndex: resultData.answers[index]?.selectedOptionIndex,
            isCorrect: resultData.answers[index]?.isCorrect
          }));
          setSelectedDetailedResult({ ...resultData, questions: detailedQuestions, testTitle: testData.title });
          setCurrentView('viewDetailedResult');
          setMessage('Result loaded.');
        } else {
          setMessage('Original test not found for this result.');
        }
      } else {
        setMessage('Test result not found.');
      }
    } catch (error) {
      console.error('Error fetching detailed result:', error);
      Alert.alert("Load Result Failed", `Failed to load result: ${error.message}`);
      setMessage(`Failed to load result: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Question Bank Management (Developer) ---
  const fetchQuestions = async () => {
    if (!db) return;
    setLoading(true); setMessage('Fetching questions...');
    try {
      const questionsRef = db.collection(`artifacts/${appId}/public/data/questions`);
      const snapshot = await questionsRef.get();
      const fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(fetchedQuestions);
      setMessage(`Found ${fetchedQuestions.length} questions.`);
    } catch (error) {
      console.error('Error fetching questions:', error);
      Alert.alert("Error", `Failed to fetch questions: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleSaveQuestion = async () => {
    if (!db || !auth.currentUser) return;
    if (!newQuestionData.text || newQuestionData.options.some(opt => !opt) || newQuestionData.correctAnswerIndex === null || newQuestionData.reason === null) {
      Alert.alert("Missing Info", "Please fill all question fields (text, 4 options, correct answer, reason).");
      return;
    }
    setLoading(true); setMessage('');
    try {
      const questionsRef = db.collection(`artifacts/${appId}/public/data/questions`);
      if (editingQuestion) {
        await questionsRef.doc(editingQuestion.id).update({
          ...newQuestionData,
          updatedBy: auth.currentUser.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setMessage('Question updated successfully!');
        setEditingQuestion(null);
      } else {
        await questionsRef.add({
          ...newQuestionData,
          createdBy: auth.currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setMessage('Question created successfully!');
      }
      setNewQuestionData({ text: '', options: ['', '', '', ''], correctAnswerIndex: null, reason: '', topic: '', difficulty: '' });
      fetchQuestions();
      setCurrentView('developerQuestionBank');
    } catch (error) {
      console.error('Error saving question:', error);
      Alert.alert("Error", `Failed to save question: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!db) return;
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this question?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: async () => {
            setLoading(true); setMessage('');
            try {
              await db.collection(`artifacts/${appId}/public/data/questions`).doc(questionId).delete();
              setMessage('Question deleted successfully!');
              fetchQuestions();
            } catch (error) {
              console.error('Error deleting question:', error);
              Alert.alert("Error", `Failed to delete question: ${error.message}`);
            } finally { setLoading(false); }
          }
        }
      ]
    );
  };

  // --- Post Management Handlers ---
  const handleCreatePost = async () => {
    if (!db || !auth.currentUser) { setMessage('Authentication and Firestore required.'); return; }
    if (!newPostTitle || !newPostHtmlContent) {
      Alert.alert("Missing Info", "Please enter both title and HTML content for the post.");
      setMessage('Please enter both title and HTML content for the post.');
      return;
    }
    setLoading(true); setMessage('');
    try {
      const postsCollectionRef = db.collection(`artifacts/${appId}/public/data/posts`);
      await postsCollectionRef.add({
        title: newPostTitle,
        htmlContent: newPostHtmlContent,
        createdBy: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMessage('Post created successfully!');
      setNewPostTitle('');
      setNewPostHtmlContent('');
      setCurrentView('developerPosts');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert("Create Post Failed", `Failed to create post: ${error.message}`);
      setMessage(`Failed to create post: ${error.message}`);
    } finally { setLoading(false); }
  };

  const fetchPosts = async () => {
    if (!db) { setMessage('Firestore not initialized.'); return; }
    setLoading(true); setMessage('Fetching posts...');
    try {
        const postsCollectionRef = db.collection(`artifacts/${appId}/public/data/posts`);
        const querySnapshot = await postsCollectionRef.get();
        const fetchedPosts = [];
        querySnapshot.forEach((docSnap) => {
            fetchedPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPosts(fetchedPosts);
        setMessage(`Found ${fetchedPosts.length} posts.`);
    } catch (error) {
        console.error('Error fetching posts:', error);
        Alert.alert("Fetch Posts Failed", `Failed to fetch posts: ${error.message}`);
        setMessage(`Failed to fetch posts: ${error.message}`);
    } finally { setLoading(false); }
  };

  const viewPostContent = (post) => {
    setSelectedPost(post);
    setCurrentView('viewPostContent');
    setMessage('');
  };

  // --- Forum Management (New Feature) ---
  const fetchForumThreads = async () => {
    if (!db) return;
    setLoading(true); setMessage('Fetching forum threads...');
    try {
      const threadsRef = db.collection(`artifacts/${appId}/public/data/forumThreads`);
      const snapshot = await threadsRef.orderBy('createdAt', 'desc').get();
      const fetchedThreads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setForumThreads(fetchedThreads);
      setMessage(`Found ${fetchedThreads.length} forum threads.`);
    } catch (error) {
      console.error('Error fetching forum threads:', error);
      Alert.alert("Error", `Failed to fetch forum threads: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleCreateForumThread = async () => {
    if (!db || !auth.currentUser) return;
    if (!newThreadTitle || !newThreadContent) {
      Alert.alert("Missing Info", "Please enter both title and content for the thread.");
      return;
    }
    setLoading(true); setMessage('');
    try {
      await db.collection(`artifacts/${appId}/public/data/forumThreads`).add({
        title: newThreadTitle,
        content: newThreadContent,
        createdBy: auth.currentUser.uid,
        creatorEmail: auth.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        comments: [],
      });
      setMessage('Thread created successfully!');
      setNewThreadTitle('');
      setNewThreadContent('');
      fetchForumThreads();
      setCurrentView(isDeveloperMode ? 'developerForums' : 'studentForums');
    } catch (error) {
      console.error('Error creating forum thread:', error);
      Alert.alert("Error", `Failed to create thread: ${error.message}`);
    } finally { setLoading(false); }
  };

  const viewForumThread = async (thread) => {
    setSelectedThread(thread);
    setMessage('Loading comments...');
    const unsubscribe = db.collection(`artifacts/${appId}/public/data/forumThreads`).doc(thread.id)
      .onSnapshot(docSnapshot => {
        if (docSnapshot.exists) {
          setSelectedThread({ id: docSnapshot.id, ...docSnapshot.data() });
          setMessage('Comments updated.');
        } else {
          setMessage('Thread no longer exists.');
          setSelectedThread(null);
        }
      }, error => {
        console.error('Error listening to thread:', error);
        setMessage('Error loading comments.');
      });

    setCurrentView('viewForumThread');
    return unsubscribe;
  };

  const handleAddForumComment = async () => {
    if (!db || !auth.currentUser || !selectedThread || !newCommentContent) return;
    setLoading(true); setMessage('');
    try {
      const comment = {
        text: newCommentContent,
        createdBy: auth.currentUser.uid,
        creatorEmail: auth.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection(`artifacts/${appId}/public/data/forumThreads`).doc(selectedThread.id).update({
        comments: firebase.firestore.FieldValue.arrayUnion(comment)
      });
      setMessage('Comment added!');
      setNewCommentContent('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert("Error", `Failed to add comment: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Resource Library (New Feature) ---
  const fetchResources = async () => {
    if (!db) return;
    setLoading(true); setMessage('Fetching resources...');
    try {
      const resourcesRef = db.collection(`artifacts/${appId}/public/data/resources`);
      const snapshot = await resourcesRef.orderBy('createdAt', 'desc').get();
      const fetchedResources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(fetchedResources);
      setMessage(`Found ${fetchedResources.length} resources.`);
    } catch (error) {
      console.error('Error fetching resources:', error);
      Alert.alert("Error", `Failed to fetch resources: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleSaveResource = async () => {
    if (!db || !auth.currentUser) return;
    if (!newResourceData.title || !newResourceData.description || (newResourceData.type === 'link' && !newResourceData.url)) {
      Alert.alert("Missing Info", "Please fill all required resource fields.");
      return;
    }
    setLoading(true); setMessage('');
    try {
      const resourcesRef = db.collection(`artifacts/${appId}/public/data/resources`);
      await resourcesRef.add({
        ...newResourceData,
        createdBy: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMessage('Resource saved successfully!');
      setNewResourceData({ title: '', description: '', type: 'link', url: '', topic: '' });
      fetchResources();
      setCurrentView('developerResources');
    } catch (error) {
      console.error('Error saving resource:', error);
      Alert.alert("Error", `Failed to save resource: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!db) return;
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this resource?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: async () => {
            setLoading(true); setMessage('');
            try {
              await db.collection(`artifacts/${appId}/public/data/resources`).doc(resourceId).delete();
              setMessage('Resource deleted successfully!');
              fetchResources();
            } catch (error) {
              console.error('Error deleting resource:', error);
              Alert.alert("Error", `Failed to delete resource: ${error.message}`);
            } finally { setLoading(false); }
          }
        }
      ]
    );
  };

  const openResourceLink = async (url) => {
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot Open Link", `Don't know how to open this URL: ${url}`);
      }
    }
  };

  // --- Analytics (New Feature) ---
  const fetchAnalyticsData = async () => {
    if (!db) return;
    setLoading(true); setMessage('Fetching analytics...');
    try {
      const studentsSnapshot = await db.collection(`artifacts/${appId}/public/data/studentProfiles`).get();
      const testsSnapshot = await db.collection(`artifacts/${appId}/public/data/tests`).get();
      const postsSnapshot = await db.collection(`artifacts/${appId}/public/data/posts`).get();
      const resultsSnapshot = await db.collection(`artifacts/${appId}/public/data/testResults`).get();

      setAnalyticsData({
        totalStudents: studentsSnapshot.size,
        totalTests: testsSnapshot.size,
        totalPosts: postsSnapshot.size,
        totalResults: resultsSnapshot.size,
      });
      setMessage('Analytics data loaded.');
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      Alert.alert("Error", `Failed to fetch analytics: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- Developer Mode Activation via Taps ---
  const handleBackgroundTap = () => {
    const currentTime = Date.now();
    if (currentTime - lastTapTimeRef.current > 500) {
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;
    lastTapTimeRef.current = currentTime;

    if (tapCountRef.current >= 7) {
      setCurrentView('devAuth');
      setMessage('Developer authentication. Please log in or sign up.');
      tapCountRef.current = 0;
    }
  };

  // --- Render Logic based on currentView ---
  const renderContent = () => {
    switch (currentView) {
      case 'welcome':
        return (
          <View style={styles.welcomeContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>📚</Text>
            </View>
            <Text style={styles.welcomeTitle}>WELCOME TO EDUPRO</Text>
            <Text style={styles.poweredByText}>POWERED BY MANDURI</Text>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => setCurrentView('auth')}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 'auth':
        return (
          <View style={styles.authContainer}>
            <Text style={styles.cardTitle}>{isLogin ? 'Welcome Back!' : 'Join Us!'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={isLogin ? handleLogin : handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? (isLogin ? 'Logging In...' : 'Signing Up...') : (isLogin ? 'Login' : 'Sign Up')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setMessage('');
              }}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => { setCurrentView('devAuth'); setMessage(''); setDeveloperEmail(''); setDeveloperPassword(''); }}
                disabled={loading}
            >
                <Text style={[styles.linkText, styles.developerLink]}>Are you a Developer?</Text>
            </TouchableOpacity>
          </View>
        );

      case 'devAuth':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Developer Login/Signup</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Developer Email"
                    value={developerEmail}
                    onChangeText={setDeveloperEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Developer Password"
                    value={developerPassword}
                    onChangeText={setDeveloperPassword}
                    secureTextEntry
                    editable={!loading}
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleDeveloperLoginAuth}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Logging In...' : 'Developer Login'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleDeveloperSignup}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Signing Up...' : 'Developer Sign Up'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => { setCurrentView('auth'); setMessage(''); setDeveloperEmail(''); setDeveloperPassword(''); }}
                    disabled={loading}
                >
                    <Text style={styles.linkText}>Back to Student Login</Text>
                </TouchableOpacity>
            </View>
        );

      case 'createProfile':
      case 'editProfile':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>{currentView === 'createProfile' ? 'Create Your Profile' : 'Edit Your Profile'}</Text>
            {Object.keys(profileData).map((key) => (
              <View style={styles.inputGroup} key={key}>
                <Text style={styles.inputLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').trim()}`}
                  value={profileData[key]}
                  onChangeText={(text) => setProfileData({ ...profileData, [key]: text })}
                  keyboardType={key === 'email' ? 'email-address' : 'default'}
                  secureTextEntry={key === 'password'}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                  editable={!loading}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving Profile...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>
            {currentView === 'editProfile' && (
              <TouchableOpacity
                  style={[styles.button, styles.tertiaryButton]}
                  onPress={() => setCurrentView('studentDashboard')}
              >
                  <Text style={styles.buttonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'studentDashboard':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Student Dashboard</Text>
            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setCurrentView('editProfile')}
            >
                <Text style={styles.buttonText}>Edit My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.yellowButton]}
                onPress={() => { setCurrentView('studentPosts'); fetchPosts(); }}
            >
                <Text style={styles.buttonText}>View Educational Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.blueButton]}
                onPress={() => { setCurrentView('studentForums'); fetchForumThreads(); }}
            >
                <Text style={styles.buttonText}>Discussion Forums</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.purpleButton]}
                onPress={() => { setCurrentView('studentResources'); fetchResources(); }}
            >
                <Text style={styles.buttonText}>Resource Library</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Available Tests</Text>
            {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
            {tests.length > 0 ? (
              <ScrollView style={styles.listContainer}>
                {tests.map((test) => (
                  <View key={test.id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{test.title}</Text>
                    <Text style={styles.listItemDescription}>{test.description}</Text>
                    <Text style={styles.listItemSmallText}>Questions: {test.questions?.length || 0}</Text>
                    {test.isPremium && <Text style={styles.premiumTag}>PREMIUM</Text>}
                    {test.lastScore !== undefined ? (
                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreText}>Last Score: {test.lastScore}/{test.totalQuestions}</Text>
                            <TouchableOpacity
                                style={styles.viewResultButton}
                                onPress={() => viewDetailedResult(`${userId}_${test.id}`)}
                            >
                                <Text style={styles.viewResultButtonText}>View Result</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => startTest(test)}
                            disabled={loading}
                        >
                            <Text style={styles.startButtonText}>Start Test</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              !loading && <Text style={styles.noDataText}>No tests available yet.</Text>
            )}

            <Text style={styles.sectionTitle}>Recommended Topics</Text>
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationText}>
                Based on your performance, we recommend focusing on:
              </Text>
              <Text style={styles.recommendationTopic}>- Algebra Basics</Text>
              <Text style={styles.recommendationTopic}>- Chemical Bonding</Text>
              <Text style={styles.recommendationTopic}>- World History (Ancient Civilizations)</Text>
              <TouchableOpacity style={styles.practiceButton}>
                <Text style={styles.practiceButtonText}>Start Practice</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'paymentRequired':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Premium Test Access</Text>
            <Text style={styles.paymentMessage}>
              The test "{selectedTest?.title}" is a premium test.
              It is restricted to students from: {selectedTest?.allowedProvinces?.join(', ') || 'N/A'}.
              Your profile indicates your province is: {profileData.province || 'N/A'}.
            </Text>
            <Text style={styles.paymentInstruction}>
              To gain access, please contact the developer for payment instructions.
              After payment, the developer will grant you access manually.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={requestPremiumAccess}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sending Request...' : 'Request Access'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('studentDashboard')}
            >
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'takeTest':
        const currentQuestion = selectedTest?.questions[currentQuestionIndex];
        if (!selectedTest || !currentQuestion) {
          return <Text style={styles.errorText}>Error: Test or question not found.</Text>;
        }
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>{selectedTest.title}</Text>
            <Text style={styles.questionCounter}>Question {currentQuestionIndex + 1} of {selectedTest.questions.length}</Text>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>
              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option, oIndex) => (
                  <TouchableOpacity
                    key={oIndex}
                    onPress={() => handleAnswerSelection(currentQuestionIndex, oIndex)}
                    style={[
                      styles.optionButton,
                      studentAnswers[currentQuestionIndex] === oIndex && styles.selectedOptionButton,
                    ]}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      studentAnswers[currentQuestionIndex] === oIndex && styles.selectedOptionButtonText,
                    ]}>
                      {String.fromCharCode(65 + oIndex)}. {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.navigationButtonsContainer}>
              <TouchableOpacity
                style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
                onPress={goToPreviousQuestion}
                disabled={loading || currentQuestionIndex === 0}
              >
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, studentAnswers[currentQuestionIndex] === null && styles.navButtonDisabled]}
                onPress={goToNextQuestion}
                disabled={loading}
              >
                <Text style={styles.navButtonText}>
                  {currentQuestionIndex === selectedTest.questions.length - 1 ? 'Submit Test' : 'Next Question'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'viewDetailedResult':
        if (!selectedDetailedResult) {
          return <Text style={styles.errorText}>No result selected for detailed view.</Text>;
        }
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Result: {selectedDetailedResult.testTitle}</Text>
            <Text style={styles.scoreTextLarge}>Score: {selectedDetailedResult.score}/{selectedDetailedResult.totalQuestions}</Text>
            <ScrollView style={styles.listContainer}>
              {selectedDetailedResult.questions.map((q, qIndex) => (
                <View key={qIndex} style={styles.resultQuestionCard}>
                  <Text style={styles.resultQuestionText}>Q{qIndex + 1}: {q.text}</Text>
                  <View style={styles.resultOptionsContainer}>
                    {q.options.map((option, oIndex) => (
                      <Text
                        key={oIndex}
                        style={[
                          styles.resultOptionText,
                          oIndex === q.correctAnswerIndex && styles.correctOptionText,
                          oIndex === q.selectedOptionIndex !== null && oIndex !== q.correctAnswerIndex && styles.incorrectOptionText,
                          oIndex === q.selectedOptionIndex !== null && oIndex === q.correctAnswerIndex && styles.selectedCorrectOptionText,
                          oIndex === q.selectedOptionIndex === null && oIndex === q.correctAnswerIndex && styles.unselectedCorrectOptionText,
                        ]}
                      >
                        {String.fromCharCode(65 + oIndex)}. {option}
                        {oIndex === q.selectedOptionIndex !== null && <Text style={styles.yourAnswerTag}> (Your Answer)</Text>}
                        {oIndex === q.correctAnswerIndex && <Text style={styles.correctAnswerTag}> (Correct)</Text>}
                      </Text>
                    ))}
                  </View>
                  {q.reason && (
                    <View style={styles.reasonContainer}>
                      <Text style={styles.reasonText}><Text style={styles.reasonLabel}>Reason:</Text> {q.reason}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
                style={[styles.button, styles.tertiaryButton]}
                onPress={() => {
                    if (isDeveloperMode) {
                        if (selectedStudentForDevView) {
                            setCurrentView('developerStudentResults');
                        } else {
                            setCurrentView('developerTestResults');
                        }
                    } else {
                        setCurrentView('studentDashboard');
                    }
                    setSelectedDetailedResult(null);
                }}
            >
                <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerDashboard':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Developer Tools</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => { setCurrentView('developerCreateTest'); setNewTestTitle(''); setPastedTestContent(''); setIsPremiumTest(false); setAllowedProvinces(''); }}
            >
                <Text style={styles.buttonText}>Create New Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.greenButton]}
                onPress={() => { setCurrentView('developerTests'); fetchTests(); }}
            >
                <Text style={styles.buttonText}>View All Tests</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.orangeButton]}
                onPress={() => { setCurrentView('developerCreatePost'); setNewPostTitle(''); setNewPostHtmlContent(''); }}
            >
                <Text style={styles.buttonText}>Create New Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.pinkButton]}
                onPress={() => { setCurrentView('developerPosts'); fetchPosts(); }}
            >
                <Text style={styles.buttonText}>View All Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => { setCurrentView('developerProfiles'); fetchStudentProfiles(); }}
            >
                <Text style={styles.buttonText}>View Student Profiles</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.redButton]}
                onPress={() => { setCurrentView('developerTestResults'); fetchAllTestResults(); }}
            >
                <Text style={styles.buttonText}>View All Test Results</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.tealButton]}
                onPress={() => { setCurrentView('developerQuestionBank'); fetchQuestions(); }}
            >
                <Text style={styles.buttonText}>Manage Question Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.blueButton]}
                onPress={() => { setCurrentView('developerForums'); fetchForumThreads(); }}
            >
                <Text style={styles.buttonText}>Manage Forums</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.purpleButton]}
                onPress={() => { setCurrentView('developerResources'); fetchResources(); }}
            >
                <Text style={styles.buttonText}>Manage Resources</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.brownButton]}
                onPress={() => { setCurrentView('developerAnalytics'); fetchAnalyticsData(); }}
            >
                <Text style={styles.buttonText}>View Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.darkGreenButton]}
                onPress={() => { setCurrentView('developerManagePremiumAccess'); fetchPremiumAccessRequests(); }}
            >
                <Text style={styles.buttonText}>Manage Premium Access</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerCreateTest':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Create Test</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Test Title"
                    value={newTestTitle}
                    onChangeText={setNewTestTitle}
                    editable={!loading}
                />
                <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder={`Test Content (Paste Here)
Example:
STATEMENT,What is 2+2?
OPTION A,3
OPTION B,4
OPTION C,5
OPTION D,6
CORRECT OPTION,(B)
REASON,(2+2 equals 4.)`}
                    value={pastedTestContent}
                    onChangeText={setPastedTestContent}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    editable={!loading}
                />
                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Is Premium Test?</Text>
                    <Switch
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor={isPremiumTest ? "#f5dd4b" : "#f4f3f4"}
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={setIsPremiumTest}
                        value={isPremiumTest}
                    />
                </View>
                {isPremiumTest && (
                    <TextInput
                        style={styles.input}
                        placeholder="Allowed Provinces (e.g., FATA,KPK,Balochistan)"
                        value={allowedProvinces}
                        onChangeText={setAllowedProvinces}
                        editable={!loading}
                        autoCapitalize="words"
                    />
                )}
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleCreateTest}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Creating Test...' : 'Create Test'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView('developerDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerTests':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>All Tests</Text>
                {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                {tests.length > 0 ? (
                    <ScrollView style={styles.listContainer}>
                        {tests.map((test) => (
                            <View key={test.id} style={styles.listItem}>
                                <Text style={styles.listItemTitle}>{test.title}</Text>
                                <Text style={styles.listItemDescription}>{test.description}</Text>
                                <Text style={styles.listItemSmallText}>Questions: {test.questions?.length || 0}</Text>
                                {test.isPremium && <Text style={styles.premiumTag}>PREMIUM</Text>}
                                {test.isPremium && test.allowedProvinces?.length > 0 && (
                                    <Text style={styles.listItemSmallText}>Allowed: {test.allowedProvinces.join(', ')}</Text>
                                )}
                                <Text style={styles.listItemSmallText}>Created by: {test.createdBy || 'N/A'}</Text>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    !loading && <Text style={styles.noDataText}>No tests found.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView('developerDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerCreatePost':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Create New Post</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Post Title"
                    value={newPostTitle}
                    onChangeText={setNewPostTitle}
                    editable={!loading}
                />
                <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder={`HTML Content (including <style> and <script> tags if needed)
Example:
<h1>Welcome to my Post!</h1>
<p style="color: blue;">This is some blue text.</p>
<script>alert('Hello from JS!');</script>`}
                    value={newPostHtmlContent}
                    onChangeText={setNewPostHtmlContent}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    editable={!loading}
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleCreatePost}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Saving Post...' : 'Save Post'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView('developerDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerPosts':
      case 'studentPosts':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Educational Posts</Text>
                {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                {posts.length > 0 ? (
                    <ScrollView style={styles.listContainer}>
                        {posts.map((post) => (
                            <TouchableOpacity
                                key={post.id}
                                style={styles.listItem}
                                onPress={() => viewPostContent(post)}
                            >
                                <Text style={styles.listItemTitle}>{post.title}</Text>
                                <Text style={styles.listItemSmallText}>Created by: {post.createdBy || 'N/A'}</Text>
                                <Text style={styles.listItemSmallText}>Created At: {post.createdAt?.toDate().toLocaleString() || 'N/A'}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    !loading && <Text style={styles.noDataText}>No posts found yet.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView(isDeveloperMode ? 'developerDashboard' : 'studentDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'viewPostContent':
        if (!selectedPost) {
            return <Text style={styles.errorText}>No post selected.</Text>;
        }
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>{selectedPost.title}</Text>
                <View style={styles.webViewContainer}>
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: selectedPost.htmlContent }}
                        style={styles.webView}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView(isDeveloperMode ? 'developerPosts' : 'studentPosts')}
                >
                    <Text style={styles.buttonText}>Back to Posts</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerProfiles':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Student Profiles</Text>
                {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                {studentProfiles.length > 0 ? (
                    <ScrollView style={styles.listContainer}>
                        {studentProfiles.map((profile) => (
                            <TouchableOpacity
                                key={profile.id}
                                style={styles.listItem}
                                onPress={() => {
                                    setSelectedStudentForDevView(profile);
                                    fetchStudentSpecificTestResults(profile.id);
                                    setCurrentView('developerStudentResults');
                                }}
                            >
                                <Text style={styles.listItemTitle}>{profile.name || 'N/A'} ({profile.email || 'No Email'})</Text>
                                <Text style={styles.listItemSmallText}>Class: {profile.className || 'N/A'}</Text>
                                <Text style={styles.listItemSmallText}>UID: {profile.id}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    !loading && <Text style={styles.noDataText}>No student profiles found.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView('developerDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerStudentResults':
        if (!selectedStudentForDevView) {
            return <Text style={styles.errorText}>No student selected.</Text>;
        }
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Results for {selectedStudentForDevView.name || selectedStudentForDevView.email || 'Selected Student'}</Text>
                <View style={styles.profileDetailCard}>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Name:</Text> {selectedStudentForDevView.name || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Email:</Text> {selectedStudentForDevView.email || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Father's Name:</Text> {selectedStudentForDevView.fatherName || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Class:</Text> {selectedStudentForDevView.className || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Province:</Text> {selectedStudentForDevView.province || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>DOB:</Text> {selectedStudentForDevView.dob || 'N/A'}</Text>
                    <Text style={styles.profileDetailText}><Text style={styles.profileDetailLabel}>Location:</Text> {selectedStudentForDevView.location || 'N/A'}</Text>
                    <Text style={[styles.profileDetailText, styles.profileDetailUid]}><Text style={styles.profileDetailLabel}>UID:</Text> {selectedStudentForDevView.id}</Text>
                </View>
                <Text style={styles.sectionTitle}>Test Submissions:</Text>
                {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                {studentSpecificTestResults.length > 0 ? (
                    <ScrollView style={styles.listContainer}>
                        {studentSpecificTestResults.map((result) => (
                            <View key={result.id} style={styles.listItem}>
                                <Text style={styles.listItemTitle}>Test ID: {result.testId}</Text>
                                <Text style={styles.listItemDescription}>Score: {result.score}/{result.totalQuestions}</Text>
                                <Text style={styles.listItemSmallText}>Submitted: {result.submittedAt?.toDate().toLocaleString() || 'N/A'}</Text>
                                <TouchableOpacity
                                    style={styles.viewResultButton}
                                    onPress={() => viewDetailedResult(result.id)}
                                >
                                    <Text style={styles.viewResultButtonText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    !loading && <Text style={styles.noDataText}>No test results found for this student.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => { setCurrentView('developerProfiles'); setSelectedStudentForDevView(null); setStudentSpecificTestResults([]); }}
                >
                    <Text style={styles.buttonText}>Back to Student Profiles</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerTestResults':
        return (
            <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>All Test Results</Text>
                {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                {testResults.length > 0 ? (
                    <ScrollView style={styles.listContainer}>
                        {testResults.map((result) => (
                            <View key={result.id} style={styles.listItem}>
                                <Text style={styles.listItemTitle}>User ID: {result.userId}</Text>
                                <Text style={styles.listItemDescription}>Test ID: {result.testId}</Text>
                                <Text style={styles.listItemSmallText}>Score: {result.score}/{result.totalQuestions}</Text>
                                <Text style={styles.listItemSmallText}>Submitted: {result.submittedAt?.toDate().toLocaleString() || 'N/A'}</Text>
                                <TouchableOpacity
                                    style={styles.viewResultButton}
                                    onPress={() => viewDetailedResult(result.id)}
                                >
                                    <Text style={styles.viewResultButtonText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    !loading && <Text style={styles.noDataText}>No test results found.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.tertiaryButton]}
                    onPress={() => setCurrentView('developerDashboard')}
                >
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      case 'developerQuestionBank':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Manage Question Bank</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setNewQuestionData({ text: '', options: ['', '', '', ''], correctAnswerIndex: null, reason: '', topic: '', difficulty: '' });
                setCurrentView('developerCreateEditQuestion');
              }}
            >
              <Text style={styles.buttonText}>Add New Question</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>All Questions</Text>
            {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
            {questions.length > 0 ? (
              <ScrollView style={styles.listContainer}>
                {questions.map((q) => (
                  <View key={q.id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>Q: {q.text}</Text>
                    <Text style={styles.listItemSmallText}>Topic: {q.topic || 'N/A'}</Text>
                    <Text style={styles.listItemSmallText}>Difficulty: {q.difficulty || 'N/A'}</Text>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingQuestion(q);
                          setNewQuestionData({ ...q, options: q.options || ['', '', '', ''] });
                          setCurrentView('developerCreateEditQuestion');
                        }}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteQuestion(q.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              !loading && <Text style={styles.noDataText}>No questions in bank.</Text>
            )}
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('developerDashboard')}
            >
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerCreateEditQuestion':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>{editingQuestion ? 'Edit Question' : 'Create New Question'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Question Text"
              value={newQuestionData.text}
              onChangeText={(text) => setNewQuestionData({ ...newQuestionData, text })}
              multiline
              editable={!loading}
            />
            {newQuestionData.options.map((option, index) => (
              <TextInput
                key={index}
                style={styles.input}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                value={option}
                onChangeText={(text) => {
                  const newOptions = [...newQuestionData.options];
                  newOptions[index] = text;
                  setNewQuestionData({ ...newQuestionData, options: newOptions });
                }}
                editable={!loading}
              />
            ))}
            <Text style={styles.inputLabel}>Correct Option (A, B, C, D)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., B"
              value={newQuestionData.correctAnswerIndex !== null ? String.fromCharCode(65 + newQuestionData.correctAnswerIndex) : ''}
              onChangeText={(text) => {
                const upperText = text.toUpperCase();
                if (['A', 'B', 'C', 'D'].includes(upperText)) {
                  setNewQuestionData({ ...newQuestionData, correctAnswerIndex: upperText.charCodeAt(0) - 65 });
                } else {
                  setNewQuestionData({ ...newQuestionData, correctAnswerIndex: null });
                }
              }}
              maxLength={1}
              autoCapitalize="characters"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Reason for Correct Answer"
              value={newQuestionData.reason}
              onChangeText={(text) => setNewQuestionData({ ...newQuestionData, reason: text })}
              multiline
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Topic (e.g., Algebra, Chemistry)"
              value={newQuestionData.topic}
              onChangeText={(text) => setNewQuestionData({ ...newQuestionData, topic: text })}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Difficulty (e.g., Easy, Medium, Hard)"
              value={newQuestionData.difficulty}
              onChangeText={(text) => setNewQuestionData({ ...newQuestionData, difficulty: text })}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleSaveQuestion}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Add Question')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('developerQuestionBank')}
            >
              <Text style={styles.buttonText}>Back to Question Bank</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerForums':
      case 'studentForums':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Discussion Forums</Text>
            <TouchableOpacity
              style={[styles.button, styles.greenButton]}
              onPress={() => setCurrentView('developerCreateThread')}
            >
              <Text style={styles.buttonText}>Create New Thread</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>All Threads</Text>
            {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
            {forumThreads.length > 0 ? (
              <ScrollView style={styles.listContainer}>
                {forumThreads.map((thread) => (
                  <TouchableOpacity
                    key={thread.id}
                    style={styles.listItem}
                    onPress={() => viewForumThread(thread)}
                  >
                    <Text style={styles.listItemTitle}>{thread.title}</Text>
                    <Text style={styles.listItemSmallText}>By: {thread.creatorEmail || 'N/A'}</Text>
                    <Text style={styles.listItemSmallText}>
                      {thread.comments?.length || 0} Comments | {thread.createdAt?.toDate().toLocaleString() || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              !loading && <Text style={styles.noDataText}>No forum threads yet.</Text>
            )}
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView(isDeveloperMode ? 'developerDashboard' : 'studentDashboard')}
            >
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerCreateThread':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Create New Forum Thread</Text>
            <TextInput
              style={styles.input}
              placeholder="Thread Title"
              value={newThreadTitle}
              onChangeText={setNewThreadTitle}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Thread Content"
              value={newThreadContent}
              onChangeText={setNewThreadContent}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleCreateForumThread}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Thread'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView(isDeveloperMode ? 'developerForums' : 'studentForums')}
            >
              <Text style={styles.buttonText}>Back to Forums</Text>
            </TouchableOpacity>
          </View>
        );

      case 'viewForumThread':
        if (!selectedThread) {
          return <Text style={styles.errorText}>No thread selected.</Text>;
        }
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>{selectedThread.title}</Text>
            <Text style={styles.threadMeta}>By: {selectedThread.creatorEmail || 'N/A'} | {selectedThread.createdAt?.toDate().toLocaleString() || 'N/A'}</Text>
            <ScrollView style={styles.threadContentContainer}>
              <Text style={styles.threadContent}>{selectedThread.content}</Text>
              <Text style={styles.sectionTitle}>Comments</Text>
              {selectedThread.comments && selectedThread.comments.length > 0 ? (
                selectedThread.comments.map((comment, index) => (
                  <View key={index} style={styles.commentItem}>
                    <Text style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{comment.creatorEmail || 'N/A'}</Text> at {comment.createdAt?.toDate().toLocaleString() || 'N/A'}
                    </Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No comments yet. Be the first to reply!</Text>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Add a comment..."
                value={newCommentContent}
                onChangeText={setNewCommentContent}
                multiline
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.commentButton}
                onPress={handleAddForumComment}
                disabled={loading || !newCommentContent.trim()}
              >
                <Text style={styles.buttonText}>Post</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView(isDeveloperMode ? 'developerForums' : 'studentForums')}
            >
              <Text style={styles.buttonText}>Back to Threads</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerResources':
      case 'studentResources':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Resource Library</Text>
            {isDeveloperMode && (
              <TouchableOpacity
                style={[styles.button, styles.greenButton]}
                onPress={() => {
                  setNewResourceData({ title: '', description: '', type: 'link', url: '', topic: '' });
                  setCurrentView('developerCreateResource');
                }}
              >
                <Text style={styles.buttonText}>Add New Resource</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sectionTitle}>Available Resources</Text>
            {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
            {resources.length > 0 ? (
              <ScrollView style={styles.listContainer}>
                {resources.map((resource) => (
                  <View key={resource.id} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{resource.title}</Text>
                    <Text style={styles.listItemDescription}>{resource.description}</Text>
                    <Text style={styles.listItemSmallText}>Type: {resource.type} | Topic: {resource.topic || 'N/A'}</Text>
                    {resource.type === 'link' && resource.url && (
                      <TouchableOpacity
                        style={styles.resourceLinkButton}
                        onPress={() => openResourceLink(resource.url)}
                      >
                        <Text style={styles.resourceLinkButtonText}>Open Link</Text>
                      </TouchableOpacity>
                    )}
                    {isDeveloperMode && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteResource(resource.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              !loading && <Text style={styles.noDataText}>No resources found yet.</Text>
            )}
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView(isDeveloperMode ? 'developerDashboard' : 'studentDashboard')}
            >
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerCreateResource':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Add New Resource</Text>
            <TextInput
              style={styles.input}
              placeholder="Resource Title"
              value={newResourceData.title}
              onChangeText={(text) => setNewResourceData({ ...newResourceData, title: text })}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Description"
              value={newResourceData.description}
              onChangeText={(text) => setNewResourceData({ ...newResourceData, description: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.inputLabel}>Type:</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, newResourceData.type === 'link' && styles.radioButtonSelected]}
                onPress={() => setNewResourceData({ ...newResourceData, type: 'link' })}
              >
                <Text style={styles.radioButtonText}>Link</Text>
              </TouchableOpacity>
            </View>
            {newResourceData.type === 'link' && (
              <TextInput
                style={styles.input}
                placeholder="URL (e.g., https://youtube.com/video)"
                value={newResourceData.url}
                onChangeText={(text) => setNewResourceData({ ...newResourceData, url: text })}
                keyboardType="url"
                autoCapitalize="none"
                editable={!loading}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Topic (e.g., Physics, History)"
              value={newResourceData.topic}
              onChangeText={(text) => setNewResourceData({ ...newResourceData, topic: text })}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleSaveResource}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : 'Add Resource'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('developerResources')}
            >
              <Text style={styles.buttonText}>Back to Resources</Text>
            </TouchableOpacity>
          </View>
        );

      case 'developerAnalytics':
        return (
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>App Analytics</Text>
            {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analyticsData.totalStudents}</Text>
                <Text style={styles.analyticsLabel}>Total Students</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analyticsData.totalTests}</Text>
                <Text style={styles.analyticsLabel}>Total Tests</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analyticsData.totalPosts}</Text>
                <Text style={styles.analyticsLabel}>Total Posts</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsValue}>{analyticsData.totalResults}</Text>
                <Text style={styles.analyticsLabel}>Total Test Results</Text>
              </View>
            </View>
            <Text style={styles.analyticsNote}>
              *More advanced charts and metrics would require dedicated charting libraries and potentially Cloud Functions for complex aggregations.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setCurrentView('developerDashboard')}
            >
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

        case 'developerManagePremiumAccess':
            return (
                <View style={styles.contentCard}>
                    <Text style={styles.cardTitle}>Manage Premium Access</Text>
                    {loading && <ActivityIndicator size="small" color="#FFC107" style={styles.loadingIndicatorSmall} />}
                    {premiumAccessRequests.length > 0 ? (
                        <ScrollView style={styles.listContainer}>
                            {premiumAccessRequests.map((request) => (
                                <View key={request.id} style={styles.listItem}>
                                    <Text style={styles.listItemTitle}>Request from: {request.userEmail}</Text>
                                    <Text style={styles.listItemDescription}>For Test: {request.testTitle}</Text>
                                    <Text style={styles.listItemSmallText}>Requested: {request.requestedAt?.toDate().toLocaleString() || 'N/A'}</Text>
                                    <TouchableOpacity
                                        style={styles.grantAccessButton}
                                        onPress={() => grantPremiumAccess(request)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.grantAccessButtonText}>Grant Access</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        !loading && <Text style={styles.noDataText}>No pending premium access requests.</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.button, styles.tertiaryButton]}
                        onPress={() => setCurrentView('developerDashboard')}
                    >
                        <Text style={styles.buttonText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            );

      default:
        return <Text style={styles.errorText}>Unknown view.</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.appContainer}>
        <TouchableOpacity style={styles.fullScreenTouchArea} onPress={handleBackgroundTap} activeOpacity={1}>
          <View style={styles.header}>
            {message ? (
              <View style={[styles.messageBox, message.includes('successful') || message.includes('Welcome') || message.includes('granted') || message.includes('Found') ? styles.successBox : styles.errorBox]}>
                <Text style={[styles.messageText, message.includes('successful') || message.includes('Welcome') || message.includes('granted') || message.includes('Found') ? styles.successText : styles.errorText]}>
                  {message}
                </Text>
              </View>
            ) : null}

            {(userId || isDeveloperMode) && currentView !== 'welcome' && (
              <View style={styles.userIdContainer}>
                <Text style={styles.userIdText}>
                  Current User ID: <Text style={styles.userIdValue}>
                    {isDeveloperMode ? 'DEVELOPER_ACCOUNT' : userId}
                  </Text>
                </Text>
                {isDeveloperMode ? (
                    <TouchableOpacity
                        onPress={() => {
                            setIsDeveloperMode(false); setMessage('Developer access ended.');
                            setCurrentView('auth');
                            setUserId(null);
                            setDeveloperEmail(''); setDeveloperPassword('');
                            setStudentProfiles([]); setTests([]); setTestResults([]); setStudentSpecificTestResults([]);
                            setNewTestTitle(''); setPastedTestContent(''); setSelectedTest(null); setSelectedDetailedResult(null); setSelectedStudentForDevView(null);
                            setNewPostTitle(''); setNewPostHtmlContent(''); setPosts([]); setSelectedPost(null);
                            setQuestions([]); setNewQuestionData({ text: '', options: ['', '', '', ''], correctAnswerIndex: null, reason: '', topic: '', difficulty: '' }); setEditingQuestion(null);
                            setForumThreads([]); setSelectedThread(null); setNewThreadTitle(''); setNewThreadContent(''); setNewCommentContent('');
                            setResources([]); setNewResourceData({ title: '', description: '', type: 'link', url: '', topic: '' });
                            setAnalyticsData({ totalStudents: 0, totalTests: 0, totalPosts: 0, totalResults: 0 });
                            setPremiumAccessRequests([]);
                            auth.signOut().catch(e => console.error("Error signing out Firebase user:", e));
                        }}
                    >
                        <Text style={styles.logoutText}>(End Dev Session)</Text>
                    </TouchableOpacity>
                ) : (
                    auth.currentUser && (
                        <TouchableOpacity onPress={() => auth.signOut()}>
                            <Text style={styles.logoutText}>(Logout)</Text>
                        </TouchableOpacity>
                    )
                )}
              </View>
            )}
          </View>
          {loading && <ActivityIndicator size="large" color="#FFC107" style={styles.loadingIndicator} />}
          {renderContent()}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- React Native Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFEB3B',
  },
  appContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEB3B',
    padding: 15,
  },
  fullScreenTouchArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  messageBox: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  successBox: {
    backgroundColor: '#D4EDDA',
    borderColor: '#28A745',
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: '#F8D7DA',
    borderColor: '#DC3545',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  successText: {
    color: '#155724',
  },
  errorText: {
    color: '#721C24',
  },
  userIdContainer: {
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  userIdText: {
    fontSize: 12,
    color: '#616161',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  userIdValue: {
    fontWeight: 'bold',
    color: '#E65100',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  logoutText: {
    fontSize: 12,
    color: '#FF6F00',
    marginTop: 5,
    textDecorationLine: 'underline',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  loadingIndicator: {
    marginTop: 20,
    marginBottom: 20,
  },
  loadingIndicatorSmall: {
    marginTop: 10,
    marginBottom: 10,
  },
  // --- Card Styles ---
  authContainer: {
    width: '100%',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  contentCard: {
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  textarea: {
    height: 150,
    paddingVertical: 10,
  },
  // --- Button Styles ---
  button: {
    width: '90%',
    backgroundColor: '#FFC107',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  secondaryButton: {
    backgroundColor: '#7E57C2',
  },
  tertiaryButton: {
    backgroundColor: '#BDBDBD',
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  orangeButton: {
    backgroundColor: '#FF9800',
  },
  pinkButton: {
    backgroundColor: '#E91E63',
  },
  redButton: {
    backgroundColor: '#F44336',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  purpleButton: {
    backgroundColor: '#9C27B0',
  },
  tealButton: {
    backgroundColor: '#009688',
  },
  brownButton: {
    backgroundColor: '#795548',
  },
  darkGreenButton: {
    backgroundColor: '#388E3C',
  },
  yellowButton: {
    backgroundColor: '#FFEB3B',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  yellowButtonText: {
    color: '#333',
  },
  linkText: {
    color: '#616161',
    fontSize: 14,
    marginTop: 10,
    textDecorationLine: 'underline',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  developerLink: {
    color: '#424242',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 25,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  listContainer: {
    width: '100%',
    maxHeight: height * 0.35,
    padding: 5,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  listItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  listItemSmallText: {
    fontSize: 11,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  scoreText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  viewResultButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  viewResultButtonText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  noDataText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 14,
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  questionCounter: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  questionCard: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    width: '100%',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 5,
  },
  selectedOptionButton: {
    backgroundColor: '#FFECB3',
    borderColor: '#FFC107',
  },
  optionButtonText: {
    fontSize: 16,
    color: '#424242',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  selectedOptionButtonText: {
    fontWeight: 'bold',
    color: '#E65100',
  },
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#BDBDBD',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#FFC107',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreTextLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  resultQuestionCard: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  resultQuestionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  resultOptionsContainer: {
    marginBottom: 10,
  },
  resultOptionText: {
    fontSize: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
    color: '#424242',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  correctOptionText: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
    fontWeight: 'bold',
  },
  incorrectOptionText: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
    fontWeight: 'bold',
  },
  selectedCorrectOptionText: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  unselectedCorrectOptionText: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
    fontWeight: 'bold',
  },
  yourAnswerTag: {
    fontStyle: 'italic',
    color: '#757575',
  },
  correctAnswerTag: {
    fontStyle: 'italic',
    color: '#388E3C',
  },
  reasonContainer: {
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    marginTop: 10,
  },
  reasonText: {
    fontSize: 13,
    color: '#424242',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  reasonLabel: {
    fontWeight: 'bold',
  },
  webViewContainer: {
    width: '100%',
    height: height * 0.4,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  webView: {
    flex: 1,
  },
  profileDetailCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    width: '100%',
  },
  profileDetailText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  profileDetailLabel: {
    fontWeight: 'bold',
  },
  profileDetailUid: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  // --- Welcome Screen Styles ---
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  iconContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  iconText: {
    fontSize: 60,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  poweredByText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 40,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  getStartedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // --- Question Bank Styles ---
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    backgroundColor: '#F5F5F5',
  },
  radioButtonSelected: {
    backgroundColor: '#FFC107',
    borderColor: '#E65100',
  },
  radioButtonText: {
    fontSize: 16,
    color: '#424242',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  fileUploadButton: {
    backgroundColor: '#607D8B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  fileUploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // --- Forum Styles ---
  threadMeta: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  threadContentContainer: {
    width: '100%',
    maxHeight: height * 0.3,
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  threadContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  commentItem: {
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  commentMeta: {
    fontSize: 11,
    color: '#616161',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  commentAuthor: {
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  commentInput: {
    flex: 1,
    marginRight: 10,
    height: 45,
    minHeight: 45,
    maxHeight: 100,
  },
  commentButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  // --- Resource Styles ---
  resourceLinkButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  resourceLinkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // --- Analytics Styles ---
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  analyticsCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#90CAF9',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    aspectRatio: 1,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  analyticsValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1565C0',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  analyticsNote: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // --- Student Dashboard Recommendation Card ---
  recommendationCard: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 15,
    color: '#388E3C',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  recommendationTopic: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  practiceButton: {
    backgroundColor: '#66BB6A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  practiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // --- DMC Verification Styles ---
  dmcInstructionText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  dmcVerifyButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  dmcStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  dmcSuccess: {
    color: '#28A745',
  },
  dmcFailed: {
    color: '#DC3545',
  },
  dmcVerifiedTag: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  // --- Premium Test Styles ---
  premiumTag: {
    backgroundColor: '#FFD700',
    color: '#A0522D',
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  paymentMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  paymentInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  grantAccessButton: {
    backgroundColor: '#28A745',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  grantAccessButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default App;

