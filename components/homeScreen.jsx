import React, { useState, useEffect } from 'react';
import { Button, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ToastAndroid } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import _ from 'lodash';
import SQLite from 'react-native-sqlite-storage';

const HomeScreen = ({ navigation }) => {
  const [testsSet, setTestsSet] = useState([]);
  const [isInternet, setIsInternet] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  

  const handleConnectivityChange = (state) => {
    const isConnected = state.isConnected;
    setIsInternet(isConnected);
    if (isConnected) {
      setShowAlert(false);
    } else {
      setShowAlert(true);
    }

    if (!isConnected) {    
      ToastAndroid.show('Połącz się z Internetem, aby być online.', ToastAndroid.SHORT);
    }
  };

  const handleButtonPress = (screen, testTitle, testId) => {
    navigation.navigate(screen, { testTitle, testId });
  };



  useEffect(() => {
    const fetchTests = async () => {
      try {
        SQLite.enablePromise(false);
        const db = await SQLite.openDatabase({ name: 'rn_storage', location: 'default' });
        const netInfoState = await NetInfo.fetch();
        const isConnected = netInfoState.isConnected;
        setIsInternet(isConnected || false);

        if (isConnected && testsSet.length === 0) {
          const response = await fetch('https://tgryl.pl/quiz/tests');
          const data = await response.json();
          const shuffledTests = _.shuffle(data);
          setTestsSet(shuffledTests);

          for (const test of shuffledTests) {
            try {
              await db.transaction(async (tx) => {
                tx.executeSql(
                  'INSERT INTO tests (id, name, description, level, numberOfTasks) VALUES (?, ?, ?, ?, ?)',
                  [test.id, test.name, test.description, test.level, test.numberOfTasks],
                  () => { console.log("Inserted values.") }
                );
              })
            } catch (insertError) {
              console.error('Error inserting into tests table:', insertError);
            }
          }  
        } else {
          try {
            if (db) {
              const result = await new Promise((resolve, reject) => {
                db.transaction((tx) => {
                  tx.executeSql('SELECT * FROM tests', [], (_, result) => {
                    resolve(result);
                    const testsFromDB = result.rows.raw();
                    setTestsSet(testsFromDB);

                  }, (_, error) => {
                    reject(error);
                  });
                });
              });
            } else {
              console.error('Error opening the database');
            }
          } catch (dbError) {
            console.error('Db error:', dbError);
          }
        }
      } catch (error) {
        console.error('Error fetching tests:', error);
        setTestsSet([]);
      }
    };

    fetchTests();
  }, [isInternet]);


  return (
    <SafeAreaView>
      <ScrollView style={styles.mainContainer}>
        {testsSet.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testContainer}
            onPress={() => handleButtonPress('Test', test.name, test.id)}>
            <Text style={styles.titleTest}>{test.name}</Text>
            <Text style={{ color: 'black' }}>Poziom: {test.level}</Text>
            <Text style={styles.contentText}>{test.description}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.footer}>
          <Text style={{ color: 'white', marginBottom: 5 }}>Sprawdź statystyki</Text>
          <Button title="Sprawdź!" color={'#44C'} onPress={() => handleButtonPress('Wyniki')}></Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    margin: 18,
  },
  testContainer: {
    display: 'flex',
    padding: 10,
    marginBottom: 18,
    borderStyle: 'solid',
    borderWidth: 2,
    borderRadius: 10,
    borderColor: '#41A',
  },
  titleTest: {
    color: 'black',
    fontSize: 20,
    fontFamily: 'Kalnia Regular',
  },
  contentText: {
    color: 'black',
    fontSize: 15,
  },
  footer: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#41A',
    display: 'flex',
    alignItems: 'center',
  },
});

export default HomeScreen;
