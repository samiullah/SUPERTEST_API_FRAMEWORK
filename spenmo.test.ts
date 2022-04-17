import request from "supertest";
import * as configurations from "./config/configurations";
import * as userData from "./data/userData";
import "dotenv/config";

let orgid;
let userid;
let wallet_amount;
let member_available_balance;
let reference_number;
let from_amount = "1";
let amountSent;
let member_updated_available_balance;

describe("Admin should be able to send amount to wallet of member", () => {
  it("A Admin should be able to get authenticated and fetch token for next request", async () => {
    const response = await request(process.env.TESTURL)
      .post(configurations.appConfig.apiURLs.login)
      .send(userData.loginDataAdmin);

    expect(response.body.status).toBe(200);
    expect(response.body.payload.status_message).toContain(
      "token generated successfully"
    );
    expect(response.body.payload.org_id).toHaveLength(36);
    expect(response.body.payload.user_id).toHaveLength(36);

    process.env.ADMINACCESSTOKEN = response.body.payload.access_token;
    orgid = response.body.payload.org_id;
    userid = response.body.payload.user_id;

    console.log(response.body.payload.user_id);
  });

  it("B Admin should be able to get current wallet balance", async () => {
    const headers = {
      authorization: "Bearer " + process.env.ADMINACCESSTOKEN,
      access: "application/json",
    };

    const response = await request(process.env.TESTURL)
      .get("/org/" + orgid + "/team/f341412a-86e6-11eb-b045-0242ac110003")
      .set(headers);

    expect(response.body.status).toBe(200);
    expect(response.body.payload.status_message).toContain("OK");
    expect(response.body.payload.team.wallet_amount).not.toBeNull();
    expect(response.body.payload.team.your_role).toBe("Admin");

    wallet_amount = response.body.payload.team.wallet_amount;

    console.log("Wallet amount with admin is: " + wallet_amount);
  });

  it("C Login as team member", async () => {
    const response = await request(process.env.TESTURL)
      .post(configurations.appConfig.apiURLs.login)
      .send(userData.loginDataNonAdmin);

    expect(response.body.status).toBe(200);
    expect(response.body.payload.status_message).toContain(
      "token generated successfully"
    );
    expect(response.body.payload.org_id).toHaveLength(36);
    expect(response.body.payload.user_id).toHaveLength(36);

    process.env.MEMBERACCESSTOKEN = response.body.payload.access_token;
    orgid = response.body.payload.org_id;
    userid = response.body.payload.user_id;
    console.log(response.body.payload.user_id);
  });

  it("D Team Member  should be able to get current wallet balance", async () => {
    const headers = {
      authorization: "Bearer " + process.env.MEMBERACCESSTOKEN,
      access: "application/json",
    };

    const response = await request(process.env.TESTURL)
      .get("/org/" + orgid + "/team/f341412a-86e6-11eb-b045-0242ac110003")
      .set(headers);

    expect(response.body.status).toBe(200);
    expect(response.body.payload.status_message).toContain("OK");
    expect(response.body.payload.team.wallet_amount).not.toBeNull();
    expect(response.body.payload.team.your_role).toBe("Member");

    member_available_balance =
      response.body.payload.team.your_membership_details.user_wallet
        .available_balance;

    member_available_balance = JSON.stringify(member_available_balance);

    console.log(
      "Available balance with  non admin is: " + member_available_balance
    );
  });

  it("E Send fund from admin wallet to member id", async () => {
    const headers = {
      authorization: "Bearer " + process.env.ADMINACCESSTOKEN,
      access: "application/json",
    };

    // converting json object to string
    const postData = {
      amount: JSON.stringify({
        to_amount: from_amount,
        to_currency: "SGD",
        from_amount: from_amount,
        from_currency: "SGD",
        fee: 0,
      }),
      sender: JSON.stringify({
        team_id: "f341412a-86e6-11eb-b045-0242ac110003",
        type: "team",
        user_id: "f34e5608-86e6-11eb-bd0a-0242ac110003",
      }),
      receiver: JSON.stringify({
        team_id: "f341412a-86e6-11eb-b045-0242ac110003",
        type: "user",
        user_id: "e460d858-96d3-11eb-96f7-0242ac110003",
      }),
      organisation_id: orgid,
    };

    const res = await request(process.env.TESTURL)
      .post(configurations.appConfig.apiURLs.sendFund)
      .set(headers)
      .send(postData);
    reference_number = res.body.payload.reference_number;
    amountSent = res.body.payload.amount;

    console.log("Reference number is: " + reference_number);
    console.log("Amount sent is : " + amountSent);
    expect(amountSent).toBe(from_amount);
  });

  it("F Get all transactions and grep if last transaction reference id is present", async () => {
    const headers = {
      authorization: "Bearer " + process.env.ADMINACCESSTOKEN,
      access: "application/json",
    };

    // converting json object to string
    const postData = {
      fields: JSON.stringify({
        id: true,
        transaction_number: true,
        amount: true,
        past_balance: true,
        available_balance: true,
        currency_id: true,
        user_id: true,
        organisation_id: true,
        created_at: true,
        type: true,
        description: true,
        vendor_transaction_id: true,
        merchant: true,
        card_type: true,
        card_last_four: true,
        foreign_currency_amount: true,
        foreign_currency_code: true,
        vendor_fee_amount: true,
        subwallet_id: true,
        team_id: true,
        isCredit: true,
        receipts: true,
        category: true,
        running_balance: true,
        simplified_merchant_name: true,
      }),
      filters: JSON.stringify({
        organisation_id: "f33ee556-86e6-11eb-9d9d-0242ac110003",
      }),
      search_filters: JSON.stringify({}),
      organisation_id: orgid,
      pg: 0,
      limit: 100,
    };

    const res = await request(process.env.TESTURL)
      .post(configurations.appConfig.apiURLs.getTransactions)
      .set(headers)
      .send(postData);
    let transactions = await res.body.payload.transactions[0];
    console.log(transactions);
    let transaction_number = transactions.transaction_number;
    console.log("transaction_number is: " + transaction_number);
    expect(transaction_number).toStrictEqual(reference_number);

    let isCredit = transactions.isCredit;
    expect(isCredit).toStrictEqual("0");
    let org_new_balance = JSON.stringify(
      transactions.running_balance.org_new_balance
    );
    let org_previous_balance = JSON.stringify(
      transactions.running_balance.org_previous_balance
    );
    console.log("org_previous_balance: " + org_previous_balance);
    console.log("org_new_balance: " + org_new_balance);
    if (isCredit === "0") {
      expect(wallet_amount).toBe(transactions.past_balance);
      expect(parseFloat(transactions.available_balance)).toBe(
        transactions.past_balance - parseInt(from_amount)
      );
      expect(org_new_balance).toEqual(org_previous_balance);
    } // did not understood when  isCredit will be 1
    else if (isCredit === "1") {
      expect(parseFloat(transactions.available_balance)).toBe(
        transactions.past_balance + parseInt(from_amount)
      );
    }
  });

  it("G Team Member  current balence should be equal to previous balance plus amount sent", async () => {
    const headers = {
      authorization: "Bearer " + process.env.MEMBERACCESSTOKEN,
      access: "application/json",
    };

    const response = await request(process.env.TESTURL)
      .get("/org/" + orgid + "/team/f341412a-86e6-11eb-b045-0242ac110003")
      .set(headers);

    expect(response.body.status).toBe(200);
    expect(response.body.payload.status_message).toContain("OK");
    expect(response.body.payload.team.wallet_amount).not.toBeNull();
    expect(response.body.payload.team.your_role).toBe("Member");
    console.log(response.body);

    member_updated_available_balance =
      response.body.payload.team.your_membership_details.user_wallet
        .available_balance;

    member_updated_available_balance = JSON.stringify(
      member_updated_available_balance
    );

    expect(parseFloat(member_updated_available_balance)).toEqual(
      parseInt(from_amount) + parseFloat(member_available_balance)
    );

    console.log(
      "Available balance" +
        member_updated_available_balance +
        "with  non admin after Sending amount equal to " +
        from_amount +
        "+  " +
        member_available_balance
    );
  });
});
