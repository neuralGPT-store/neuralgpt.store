export const ChatRoom = {
  messages: [],
  post(name,msg){
    this.messages.push({name,msg,date:new Date()});
    return this.messages;
  }
};
