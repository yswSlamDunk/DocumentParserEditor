import { addLog } from './utils.js';

export class State {
    constructor() {
        this.page = page;
        this.elementId = elementId;
        this.timeStamp = timeStamp;
        this.jsonFile = jsonFile;
        this.eventCategory = eventCategory;
    }
}

export class StateHandler {
    constructor() {
        this.maxNumOfState = 20;
        this.state = [];
        this.currentStateIndex = 0;
    }

    updateState(newState) {
        if (this.currentStateIndex === this.maxNumOfState) {
            this.state.shift();
            this.state.push(newState);
        }            

        else {
            this.state = this.state.slice(0, this.currentStateIndex);
            this.currentStateIndex++;
            this.state.push(newState);
        }
    }

    statePrevious() {
        if (this.currentStateIndex === 0) {
            return false;
        }
        else {
            this.currentStateIndex--;
            return this.state[this.currentStateIndex];
        }
    }

    stateNext() {
        if (this.currentStateIndex === this.maxNumOfState) {
            return false;
        }
        else {
            this.currentStateIndex++;
            return this.state[this.currentStateIndex];
        }
    }
}