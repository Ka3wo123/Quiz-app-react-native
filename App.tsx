  import React, { useEffect, useState } from 'react';
  import { View, Text, Button, SafeAreaView, Alert, ToastAndroid } from 'react-native';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { DrawerContentScrollView, DrawerItemList, DrawerItem, createDrawerNavigator } from '@react-navigation/drawer';
  import SplashScreen from 'react-native-splash-screen';
  import HomeScreen from './components/homeScreen';
  import ResultsScreen from './components/resultsScreen';
  import TestScreen from './components/testScreen';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import _ from 'lodash';
  import NetInfo from '@react-native-community/netinfo';
  import SQLite from 'react-native-sqlite-storage';

  const Stack = createNativeStackNavigator();
  const Drawer = createDrawerNavigator();

  const WelcomeScreen = ({ route }: any) => {
    const [termsAccepted, setTermsAccepted] = React.useState(false);
    const { setUserToken } = route.params;

    const handleAccept = async () => {
      try {
        await AsyncStorage.setItem('@firstRun', 'true');
        setTermsAccepted(true);
      } catch (error) {
        console.error('Error saving to AsyncStorage:', error);
      }
    };

    

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black', padding: 10, justifyContent: 'center', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 25, color: 'white' }}>Regulamin</Text>
        </View>
        <Text style={{ color: 'white' }}>
          Zapoznałem się i akceptuję regulamin korzystania z aplikacji Quiz.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
          <Button title="Akceptuj" color="#41A" onPress={handleAccept} />
          <Button
            title="Przejdź do menu głównego"
            color="#41A"
            onPress={() => setUserToken('token')}
            disabled={!termsAccepted}
          />
        </View>
      </SafeAreaView>
    );
  };

  function DrawerRoutes({ testsSet, navigateToTest, fetchTests }: { testsSet: any[]; navigateToTest: any, fetchTests: any }) {
    const handleRandomTestNavigation = () => {
      const randomTest = testsSet[Math.floor(Math.random() * testsSet.length)];
      navigateToTest.navigate('Test', { testTitle: randomTest.name, testId: randomTest.id });
    };
    const handleFetchTests = async () => {
      await fetchTests();
    }

    return (
      <Drawer.Navigator
        initialRouteName="Menu"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#41A',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontFamily: 'Kalnia Bold',
            fontSize: 10,
          },
          headerTitleAlign: 'center',
          drawerActiveTintColor: '#41A',
          drawerInactiveTintColor: '#41A',
        }}
        drawerContent={(props) => (
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            <DrawerItem
              label="Losowy Test"
              onPress={handleRandomTestNavigation}            
              labelStyle={{
                color: '#41A',
                fontFamily: 'Kalnia Regular',
                fontSize: 19,
                borderBottomWidth: 2,
              }}          
            />
            <DrawerItem
            label='Pobierz testy'
            onPress={handleFetchTests}
            labelStyle={{
              color: '#41A',
              fontFamily: 'Kalnia Regular',
              fontSize: 19,
              borderBottomWidth: 2,
            }}/>
          </DrawerContentScrollView>
        )}
      >
        <Drawer.Screen name="Menu główne" component={HomeScreen}/>
        <Drawer.Screen
          name="Wyniki"
          component={ResultsScreen}
          options={{ drawerItemStyle: { borderBottomWidth: 1, borderBottomColor: '#41A' }, unmountOnBlur: true}}
        
        />
        {testsSet?.map((test) => (
          <Drawer.Screen
            key={test.id}
            name={test.name}
            component={TestScreen}
            initialParams={{ testTitle: test.name, testId: test.id }}
            options={{
              unmountOnBlur: true,
            }}
          />
        ))}
      </Drawer.Navigator>
    );
  }



  function App() {
    const [showScreen, setShowScreen] = React.useState(false);
    const [userToken, setUserToken] = React.useState<string | null>(null);
    const [testsSet, setTestsSet] = React.useState<any[]>([]);
    const [isInternet, setIsInternet] = useState(true);  

    const handleConnectivityChange = (state: any) => {
      const isConnected = state.isConnected;
      setIsInternet(isConnected);    

      if (!isConnected) {      
        ToastAndroid.show('Połącz się z Internetem, aby być online.', ToastAndroid.SHORT);
      }
    };

    const fetchTests = async () => {
      try {        
        const db = await SQLite.openDatabase({ name: 'rn_storage', location: 'default' });
        const netInfoState = await NetInfo.fetch();
        const isConnected = netInfoState.isConnected;
        setIsInternet(isConnected || false);

        if (isConnected) {          
          const response = await fetch('https://tgryl.pl/quiz/tests');
          const data = await response.json();
          const shuffledTests = _.shuffle(data);
          setTestsSet(shuffledTests);

          try {
            if (db) {
              await db.transaction(async (tx) => {
                tx.executeSql(
                  "CREATE TABLE IF NOT EXISTS tests (id TEXT PRIMARY KEY, name VARCHAR(150), description VARCHAR(150), level VARCHAR(150), numberOfTasks INTEGER)",
                  [],
                  () => { console.log("Created table.") }
                );

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
              });
            } else {
              console.error('Error opening the database:');
            }
          } catch (dbError) {
            console.error('Error in db here:', dbError);
          }
        } else {
          console.log("Internet is not available. Getting data from the database.");
          try {
            if (db) {
              const result: any = await new Promise((resolve, reject) => {
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

    

    useEffect(() => {
      SplashScreen.hide();

      const checkFirstRun = async () => {
        try {
          const value = await AsyncStorage.getItem('@firstRun');
          if (value === null) {
            setShowScreen(true);
            await AsyncStorage.setItem('@firstRun', 'false');
          } else {
            setShowScreen(false);
          }
        } catch (error) {
          console.error('Error checking first run:', error);
        }
      };

      const unsubscribeNetInfo = NetInfo.addEventListener(handleConnectivityChange);

      checkFirstRun();
      fetchTests();


      return () => {
        unsubscribeNetInfo();
      }

    }, [isInternet]);

    return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#41A',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontFamily: 'Kalnia Bold',
              fontSize: 10,
            },
            headerTitleAlign: 'center',
          }}
        >
          {showScreen && userToken === null ? (
            <Stack.Screen
              name="Regulamin"
              component={WelcomeScreen}
              options={{ headerShown: false }}
              initialParams={{ setUserToken }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Menu"
                options={{ headerShown: false }}>
                {(props) => <DrawerRoutes testsSet={testsSet} navigateToTest={props.navigation} {...props}  fetchTests={fetchTests}/>}
              </Stack.Screen>
              <Stack.Screen name="Test" component={TestScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  export default App;
