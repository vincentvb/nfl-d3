import requests
from bs4 import BeautifulSoup
import datetime
import re
import json

with open('teams.json') as file:
    TEAMS = json.loads(file.read())

def normalization(data):
    norm = [float(i)/sum(data) for i in data]
    return [round(round(norm[0], 2) * 100, 2), round(round(norm[1], 2) * 100, 2)]


def add_title(num):
    if num == 1 or num == 31:
        return str(num) + 'ST'
    elif num == 2:
        return str(num) + 'ND'
    elif num == 3:
        return str(num) + 'RD'
    elif num >= 4 and num <= 20:
        return str(num) + 'TH'
    elif num == 21:
        return str(num) + 'ST'
    elif num == 22:
        return str(num) + 'ND'
    elif num == 23:
        return str(num) + 'RD'
    elif num >= 24 and num <= 30:
        return str(num) + 'TH'

page = requests.get('https://www.pro-football-reference.com/years/2021/games.htm')
soup = BeautifulSoup(page.content, 'html.parser')

rows = soup.find_all('tr', class_=lambda x: x != 'thead')

all_dics = []
all_prepped_dics = []
current_week_arr = []
current_week = 1
current_game = 0

for idx, row in enumerate(rows[1:]):
    data = row.find_all('td')
    
    winner = next(x for x in data if x.get('data-stat') == 'winner')
    if winner.text:
        winner = TEAMS[winner.text]
    else:
        break

    week = int(row.find('th').text)


    if current_week != week:
        all_prepped_dics.append(current_week_arr)
        current_week_arr = []

        current_week = week
        current_game = 0

    loser = TEAMS[next(x for x in data if x.get('data-stat') == 'loser').text]
    winner_points = int(next(x for x in data if x.get('data-stat') == 'pts_win').text)
    loser_points = int(next(x for x in data if x.get('data-stat') == 'pts_lose').text)
    normalized = normalization([int(winner_points), int(loser_points)])

    winner_points_normalized = normalized[0]
    loser_points_normalized = 100 - winner_points_normalized
    
    day = next(x for x in data if x.get('data-stat') == 'game_day_of_week').text.upper()

    game_date = next(x for x in data if x.get('data-stat') == 'game_date').text
    parsed_date = datetime.datetime.strptime(game_date, "%Y-%m-%d")
    month = parsed_date.strftime("%b").upper()
    monthDay = add_title(parsed_date.day)

    event_parsed = re.split('(AM|PM)', next(x for x in data if x.get('data-stat') == 'gametime').text)
    event = f"{event_parsed[0]} {event_parsed[1]}"
    
    all_dics.append({
        "week": week,
        "teamANickname": winner,
        "teamBNickname": loser,
        "teamASuccess": winner_points_normalized,
        "teamBSuccess": loser_points_normalized,
        "day": day,
        "month": month,
        "monthDay": monthDay,
        "event": event,
        "idx": idx,
        "game": current_game
    })

    current_week_arr.append([
        {
            "team": winner,
            "success": winner_points_normalized,
            "rawSuccess": winner_points,
            "oppTeam": loser,
            "oppTeamSuccess": loser_points_normalized,
            "rawOppTeamSuccess": loser_points,
            "week": week,
            "idx": idx
        },
        {
            "team": loser,
            "success": loser_points_normalized,
            "rawSuccess": loser_points,
            "oppTeam": winner,
            "oppTeamSuccess": winner_points_normalized,
            "rawOppTeamSuccess": winner_points,
            "week": week,
            "idx": idx
        }
    ])

    current_game += 1

    if idx == 271:
        all_prepped_dics.append(current_week_arr)


with open("data_new.json", "w") as file:
    json.dump(all_dics, file, indent=2)

with open("preppedData_new.json", "w") as file:
    json.dump(all_prepped_dics, file, indent=2)

    



    