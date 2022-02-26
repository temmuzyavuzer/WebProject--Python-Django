from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import User, Post
import json, time

#home view that shows all posts
def index(request):
    #get end post indexes from
    #get request from js when reached page end, or default start from beginning
    start = int(request.GET.get('start') or 0)
    end = int(request.GET.get('end') or start+10)

    show_all_posts = Post.objects.all()
    #descending order by time
    show_all_posts = show_all_posts.order_by("-time").all()
    return render(request, "network/index.html",{
        'posts': show_all_posts,
        'view_for': 'Home'
    })

#search view to search the other usernames
def search(request):
    if request.method == 'POST':
        search_value = str(request.POST['search']).lower()
        if search_value == '':
            return HttpResponseRedirect(reverse(index))
        userdb = User.objects.values_list('username',flat=True)
        potential = []
        #if we found an exact user match then
        if search_value in userdb:
            return HttpResponseRedirect(reverse(user_profile, args=(search_value,)))
        
        else:
            for user in userdb:
                if len(user.split(search_value)) > 1:
                    searched_user = User.objects.get(username=user)
                    potential.append(searched_user)
            return render(request, 'network/search.html', {
                'potential':potential
            })

#user profile view
@csrf_exempt
def user_profile(request,username):
    #PUT request to follow or unfollow the profile that you are visiting
    #you have to login in to your account
    if request.method == 'PUT' and request.user.is_authenticated:
        current_username=request.user
        current_user = User.objects.get(username=current_username)
        data = json.loads(request.body)

        #to follow the profile
        if data.get('follow') is not None:
            profile_username = data['follow']
            profile_user = User.objects.get(username=profile_username)
            #relationship between current user and other user
            current_user.relationship.add(profile_user)
            current_user.save()
            return JsonResponse({"message": f"followed {profile_username} successfully."}, status=201)

        #to unfollow the profile
        if data.get('unfollow') is not None:
            profile_username = data['unfollow']
            profile_user = User.objects.get(username=profile_username)
            # remove relationship between current user and other user
            current_user.relationship.remove(profile_user)
            current_user.save()
            return JsonResponse({"message": f"unfollowed {profile_username} successfully."}, status=201)

    #GET Request to view the profile
    real_prof_owner = User.objects.get(username=username)
    #filtering post by authorid, which is basically currently logged user
    profile_posts = Post.objects.filter(author=real_prof_owner)
    profile_posts = profile_posts.order_by("-time").all()
    return render(request, 'network/profile.html',{
        'posts':profile_posts,
        'real_prof_owner': real_prof_owner
    })

#following view, which will only show the content from the users you follow
@login_required
def following(request):
    current_username=request.user
    current_user = User.objects.get(username=current_username)
    #take all the post, order descanding
    all_posts = Post.objects.all()
    all_posts = all_posts.order_by("-time").all()
    #filter the posts regarding if owner of the post's id is in our current user's relations
    following_posts = [post for post in all_posts if post.author in current_user.relationship.all()]
    
    return render(request, "network/index.html",{
        'posts':following_posts,
        'view_for': 'Following'
    })

#create new post view
#which takes json object, extracts the info
#feed into model from models.py
@csrf_exempt
@login_required
def new(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        info = data.get('content')
        author = request.user
        new_post = Post.objects.create(author=author,content=info)

        return JsonResponse({"id_created":new_post.id, "message": "Post created successfully"},status=201)


#Deals with individual posts
@csrf_exempt
def post(request, id):
    #PUT request to update existing post, but you have to logged in
    if request.method == 'PUT' and request.user.is_authenticated:
        current_username=request.user
        current_user = User.objects.get(username=current_username)
        data = json.loads(request.body)
        post = Post.objects.get(pk=id)

        #updates post content
        if data.get('content') is not None:
            post.content = data['content']

        #updating post like, if like button pressed then increment, otherwise decrease
        if data.get('like') is not None:
            if data['like'] == True:
                post.likes += 1
                post.liked_by.add(current_user)
            else:
                post.likes -= 1
                post.liked_by.remove(current_user)

        #add a comment
        if data.get('reply') is not None:
            replied_by_id = data['reply']
            reply_post = Post.objects.get(pk=replied_by_id)
            post.replies.add(reply_post)

        post.save()
        time.sleep(1)
        return JsonResponse({"message": "post updated successfully."}, status=201)

    # otherwise GET request to show posts and comments if are there any
    main_post = Post.objects.get(pk=id)
    comments = main_post.replies.order_by("-time").all()
    
    return render (request, "network/indiv.html", {
        'main_post':main_post,
        'comments':comments
    })

#login view
def login_view(request):
    if request.method == "POST":
        # trying to sign(authenticate) user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # checking that if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")

#log out view
def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


#register view
def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        first_name = request.POST['first']
        last_name = request.POST['last']
        email = request.POST["email"]

        # make sure that password matches each other
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords don't match. Please try again"
            })

        # creating user if the conditions are fullfield
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
            user.first_name=first_name
            user.last_name=last_name
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken! Please try another."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

