const { collection, doc, getDocs, query, setDoc, where } = require('firebase/firestore');

class FirebaseService {
  constructor(db) {
    this.db = db;
    this.groupsCollection = collection(this.db, 'groups');
  }

  async getGroupCommand(groupId) {
    try {
      const q = query(this.groupsCollection, where('groupId', '==', groupId));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
    } catch (error) {
      console.error('Error fetching group command:', error);
      return null;
    }
  }

  async updateTagMessage(groupId, message, type) {
    try {
      await setDoc(
        doc(this.db, 'groups', groupId.toString()),
        { groupId, message, type },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating tag message:', error);
      throw error;
    }
  }
}

module.exports = FirebaseService;
