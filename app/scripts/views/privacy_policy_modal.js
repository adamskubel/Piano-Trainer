import React, {Component} from "react";
import { Modal, Button } from 'react-bootstrap';

export default class PrivacyPolicyModal extends Component {
  render() {
    return (
      <Modal {...this.props} bsSize="large" aria-labelledby="contained-modal-title-lg">
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-lg">Privacy Policy</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This website uses Google Analytics, a web analytics service provided by Google Inc. („Google“). Google Analytics uses „cookies“, text files that are saved on your computer and enable an analysis of your use of this website. The information generated by the cookie about your use of this website are usually transmitted to a Google server in the USA and stored there.</p>
          <p>In case of activation of the IP anonymization on this website, your IP address will be shortened within Member States of the European Union or other parties to the Agreement on the European Economic Area. Only in exceptional cases is the complete IP address transmitted to a Google server in the USA and shortened there.</p>
          <p>On behalf of the operator of this website, Google will use this information to evaluate your use of the website, compiling reports on website activity and providing other with website and internet related services to the website operator. The IP address transmitted by your browser as part of Google Analytics is not merged with other data of Google.</p>
          <p>You can refuse the use of cookies by selecting the appropriate settings on your browser software. We point out that you may not be able to use all features of this site in this case. You can also prevent the data generated by the cookie about your use of the website (incl. your IP address) to Google and the processing of these data by Google, by downloading and installing the browser plugin available at the following link http://tools.google.com/dlpage/gaoptout?hl=de.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
};
