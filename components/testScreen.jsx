import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ToastAndroid } from 'react-native';
import * as Progress from 'react-native-progress';
import _ from 'lodash'
import NetInfo from '@react-native-community/netinfo';

const TestScreen = ({ route, navigation }) => {
  const { testTitle, testId } = route.params;

  const resetState = useCallback(() => {
    setCurrentQuestion(0);
    setSelectedAnswerIndex(null);
    setCorrectAnswerIndex(null);
    setRemainingTime(data[0]?.duration || 0);
    setCountCorrect(0);
    setIsButtonDisabled(false);
    setIsTestFinished(false);
  }, [testTitle]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState([]);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const isMounted = useRef(true);
  const [countCorrect, setCountCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [data, setData] = useState([]);
  const [isInternet, setIsInternet] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  const handleConnectivityChange = (state) => {
    setIsInternet(state.isConnected);
    if (isInternet) {
      setShowAlert(false);
    } else {
      setShowAlert(true);
    }

    if (!state.isConnected && showAlert) {      
      ToastAndroid.show('Połącz się z Internetem, aby móc zagrać w ten test i zapisać wyniki.', ToastAndroid.SHORT);
    }
  };



  const sendResultsToServer = (p1, p2, p3) => {
    if (isMounted && isInternet) {
      try {
        fetch('https://tgryl.pl/quiz/result', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nick: "abc",
            score: p1,
            total: p2,
            type: p3
          })
        });

      } catch (error) {
        console.error('Błąd podczas wysyłania wyników:', error);
      }
    }
  };


  useEffect(() => {    
    const fetchQuestions = async () => {
      try {
        const netInfoState = await NetInfo.fetch();
        setIsInternet(netInfoState.isConnected || false);

        if (netInfoState.isConnected && currentAnswers.length === 0) {
          fetch('https://tgryl.pl/quiz/test/' + testId)
            .then(res => res.json())
            .then(data => {
              const shuffledData = _.shuffle(data.tasks);
              setData(shuffledData);
              setTotal(shuffledData.length);
              setRemainingTime(shuffledData[currentQuestion]?.duration || 0);

              const shuffledAnswers = _.shuffle(shuffledData[currentQuestion]?.answers || []);
              setCurrentAnswers(shuffledAnswers);

              setCurrentQuestion(currentQuestion + 1);
            })
        }
      } catch (error) {
        console.error('Błąd podczas pobierania testu:', error);
      }
    }

    fetchQuestions();

    const unsubscribeNetInfo = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribeNetInfo();
    }

  }, [isInternet]);

  const handleAnswerPress = (index, isCorrect) => {
    setSelectedAnswerIndex(index);
    setIsButtonDisabled(true);

    setCountCorrect(isCorrect ? countCorrect + 1 : countCorrect);

    setTimeout(() => {
      if (currentQuestion < total) {
        setCurrentAnswers(_.shuffle(data[currentQuestion]?.answers));
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswerIndex(null);
        setCorrectAnswerIndex(null);
        setRemainingTime(data[currentQuestion]?.duration || 0);
        setIsButtonDisabled(false);
      } else {
        isMounted.current = false;
        setIsTestFinished(true);
        sendResultsToServer(countCorrect, total, testTitle);
        navigation.navigate("Wyniki");
      }
    }, 1500);

  };

  const answerTexts = currentAnswers.map((answer, index) => {
    const backgroundColor = (() => {
      if (selectedAnswerIndex !== null) {
        return selectedAnswerIndex === index ? (answer.isCorrect ? 'green' : 'red') : '#41A';
      } else if (correctAnswerIndex !== null && correctAnswerIndex === index) {
        return '#ddd';
      } else {
        return '#41A';
      }
    })();

    return (
      <TouchableOpacity
        key={index}
        style={[styles.answerStyle, { backgroundColor }]}
        onPress={() => handleAnswerPress(index, answer.isCorrect)}
        disabled={isButtonDisabled}
      >
        <Text style={styles.answerText}>{answer.content}</Text>
      </TouchableOpacity>);
  });


  useEffect(() => {
    
    isMounted.current = true;

    const timer = setInterval(() => {
      setRemainingTime((prevTime) => {
        const currentTime = Math.max(0, prevTime - 1);

        if (currentTime === 0 && isInternet) {
          setIsButtonDisabled(true);
          setCorrectAnswerIndex(currentAnswers.findIndex(answer => answer.isCorrect));

          setTimeout(() => {
            if (isMounted.current && currentQuestion < total - 1) {
              setCurrentQuestion(currentQuestion + 1);
              setSelectedAnswerIndex(null);
              setCorrectAnswerIndex(null);
              setRemainingTime(data[currentQuestion]?.duration || 0);
              setCurrentAnswers(_.shuffle(data[currentQuestion]?.answers) || []);
            } else if (!isTestFinished && isMounted.current && isInternet) {
              setIsTestFinished(true);
              sendResultsToServer(countCorrect, total, testTitle);
              navigation.navigate("Wyniki");
            }
            setIsButtonDisabled(false);
          }, 1500);
        }

        return currentTime;
      });
    }, 1000);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [currentQuestion, data, isTestFinished, currentAnswers, total, countCorrect, navigation, testTitle]);



  useEffect(() => {
    navigation.setOptions({
      title: testTitle
    });
  }, [testTitle, navigation]);

  useEffect(() => {
    resetState();
  }, [route, resetState]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.infoContainer}>
        <Text style={{ color: 'white' }}>Question {currentQuestion} of {total}</Text>
        <Text>{countCorrect}/{total}</Text>
        <Text style={{ color: 'white' }}>Time left: {remainingTime} sec</Text>
      </View>

      <View style={{ alignItems: 'center', width: '100%' }}>
        <Progress.Bar progress={
          data[currentQuestion - 1]?.duration > 0 ? remainingTime / data[currentQuestion - 1]?.duration : 0}
          width={300} height={12} color='#41F' />
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{data[currentQuestion - 1]?.question}</Text>
      </View>

      <View style={styles.answersContainer}>
        {answerTexts}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#63D',
    margin: 10,
    padding: 10,
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: 2
  },
  answersContainer: {
    borderTopColor: '#41F',
    borderTopWidth: 2,
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    padding: 7
  },
  questionContainer: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    padding: 15
  },
  answerStyle: {
    color: 'white',
    backgroundColor: '#41A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'black',
    width: '100%',
    height: 80,
    padding: 5,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5
  },
  answerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  questionText: {
    color: 'black',
    fontSize: 20
  }


});

export default TestScreen;