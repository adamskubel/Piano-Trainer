require("html!../index.html");
require("../styles/index.less");
require("font-awesome-webpack");

import React, {Component} from "react";
import PitchReadingView from "./views/pitch_reading_view";
import RhythmReadingView from "./views/rhythm_reading_view";
import PrivacyPolicyModal from "./views/privacy_policy_modal";
import NewsletterForm from "./views/newsletter_form";
import PitchStatisticService from "./services/pitch_statistic_service.js";
import RhythmStatisticService from "./services/rhythm_statistic_service.js";
import AnalyticsService from "./services/analytics_service.js";
import AppFreezer from "./AppFreezer.js";
import { Nav, NavItem, Button, Input } from 'react-bootstrap';
import classNames from 'classnames';

const pianoBackgroundJpg = require("file!../images/piano-background.jpg");


export default class App extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      activeGame: "pitch",
      showPrivacyPolicy: false,
    };
  }

  selectGame(newGame) {
    this.setState({
      activeGame: newGame
    });

    AnalyticsService.sendEvent('GameSelection', newGame);
  }

  render() {
    const appState = AppFreezer.get();

    return (
      <div className="site">
        <div className="site-content">
          <img id="image-background" src={pianoBackgroundJpg} />

          <div className="jumbotron">
            <h3>Sheet Music Tutor</h3>
            <div className="row center-xs">
              <div className="col-xs">
                <Nav
                 bsStyle="pills" activeKey={this.state.activeGame}
                 onSelect={this.selectGame.bind(this)}
                 className="inlineBlock">
                  <NavItem eventKey="pitch" className="modeNavItem">Pitch training</NavItem>
                  <NavItem eventKey="rhythm" className="modeNavItem">Rhythm training</NavItem>
                </Nav>
              </div>
            </div>
          </div>

          <div className="gameContainer">
            <PitchReadingView
             statisticService={PitchStatisticService}
             settings={appState.settings.pitchReading}
             key="pitch_game"
             isActive={this.state.activeGame === "pitch"}
            />
            <RhythmReadingView
             statisticService={RhythmStatisticService}
             settings={appState.settings.rhythmReading}
             key="rhythm_game"
             isActive={this.state.activeGame !== "pitch"}
            />
          </div>
        </div>
      </div>

    );
  }

  componentDidMount() {
    AppFreezer.on('update', () => this.forceUpdate());
  }
}
