import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, RefreshControl, StyleSheet, FlatList, SafeAreaView, ToastAndroid } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const ResultsScreen = () => {
  const [results, setResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInternet, setIsInternet] = useState(true);
  const [showAlert, setShowAlert] = useState(true);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchResults();
  }, []);

  const handleConnectivityChange = (state) => {
    setIsInternet(state.isConnected);
    if (isInternet) {
      setShowAlert(false);
    } else {
      setShowAlert(true);
    }

    if (!state.isConnected && showAlert) {
      ToastAndroid.show('Połącz się z Internetem, aby móc zobaczyć statystyki.', ToastAndroid.SHORT);
    }
  };

  const fetchResults = async () => {
    try {

      const netInfoState = await NetInfo.fetch();
      const isConnected = netInfoState.isConnected;
      setIsInternet(isConnected || false);

      if (isConnected) {
        const response = await fetch('https://tgryl.pl/quiz/results?last=30');
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        setResults(sortedData);
        setRefreshing(false);
      }

    } catch (error) {
      return (
        () => {
          console.error('Error fetching results:', error);          
        }
      )
    }
  };

  const renderItem = ({ item, index }) => {
    const backgroundColor = index % 2 === 0 ? '#FFF' : '#DDD';
    return (
      <View style={[styles.row, { backgroundColor }]}>
        <Text style={styles.cell}>{item.nick}</Text>
        <Text style={styles.cell}>{item.score}</Text>
        <Text style={styles.cell}>{item.total}</Text>
        <Text style={styles.cell}>{item.type}</Text>
        <Text style={styles.cell}>{item.createdOn}</Text>
      </View>
    );
  };

  useEffect(() => {
    fetchResults();

    const unsubscribeNetInfo = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribeNetInfo();
    }
  }, [isInternet]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerTopBar}>
        <Text style={{
          color: 'white',
          fontSize: 20,
          fontFamily: 'serif'
        }}>Wyniki użytkowników</Text>
      </View>
      <FlatList
        data={results}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyExtractor={(item) => { return item.id }}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.heading}>
            <Text style={styles.headerText}>Nick</Text>
            <Text style={styles.headerText}>Punkty</Text>
            <Text style={styles.headerText}>Max punkty</Text>
            <Text style={styles.headerText}>Typ</Text>
            <Text style={styles.headerText}>Data</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10
  },

  headerTopBar: {
    backgroundColor: '#41A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    elevation: 20,
    alignItems: 'center'

  },

  headerText: {
    color: 'black',
    fontSize: 18,
  },

  heading: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5

  },

  row: {
    flexDirection: 'row',
    borderRadius: 3,
    borderColor: '#000',
    padding: 2,

  },
  cell: {
    flex: 1,
    color: 'black',
    fontSize: 9,
    marginLeft: 15

  }

})

export default ResultsScreen;
