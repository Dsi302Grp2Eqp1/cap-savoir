class ErreurApi extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}
module.exports = ErreurApi;
